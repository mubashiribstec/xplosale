import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(4).max(500) }),
]);

type Params = { params: Promise<{ shopId: string }> };

/** POST /api/admin/shops/[shopId] — approve or reject a PENDING_REVIEW shop */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, status: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.status !== "PENDING_REVIEW") return err("Shop is not pending review.", 422);

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action } = parsed.data;
    const newStatus = action === "approve" ? "ACTIVE" : "REJECTED";
    const reason = action === "reject" ? parsed.data.reason : undefined;

    await prisma.$transaction([
      prisma.shop.update({ where: { id: shopId }, data: { status: newStatus } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: action === "approve" ? "SHOP_APPROVED" : "SHOP_REJECTED",
          targetType: "Shop",
          targetId: shopId,
          reason: reason ?? null,
        },
      }),
    ]);

    return ok({ status: newStatus });
  } catch (e) {
    return parseError(e);
  }
}

/** DELETE /api/admin/shops/[shopId] — suspend a shop (preserves order history) */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, _count: { select: { orders: true } } },
    });
    if (!shop) return err("Shop not found", 404);

    await prisma.$transaction([
      prisma.shop.update({ where: { id: shopId }, data: { status: "SUSPENDED" } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "SHOP_DELETED",
          targetType: "Shop",
          targetId: shopId,
          reason: `Suspended shop: ${shop.name}`,
        },
      }),
    ]);

    return ok({ suspended: true });
  } catch (e) {
    return parseError(e);
  }
}
