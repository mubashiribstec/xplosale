import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().min(4).max(500) }),
  z.object({ action: z.literal("ban"), reason: z.string().min(4).max(500) }),
  z.object({ action: z.literal("unban") }),
]);

type Params = { params: Promise<{ shopId: string }> };

/** POST /api/admin/shops/[shopId] — approve/reject a pending shop, or ban/unban any shop */
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

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action } = parsed.data;

    if ((action === "approve" || action === "reject") && shop.status !== "PENDING_REVIEW") {
      return err("Shop is not pending review.", 422);
    }
    if (action === "ban" && shop.status === "SUSPENDED") {
      return err("Shop is already banned.", 422);
    }
    if (action === "unban" && shop.status !== "SUSPENDED") {
      return err("Shop is not currently banned.", 422);
    }

    const newStatus =
      action === "approve" ? "ACTIVE" :
      action === "reject" ? "REJECTED" :
      action === "ban" ? "SUSPENDED" :
      "ACTIVE";

    const logAction =
      action === "approve" ? "SHOP_APPROVED" :
      action === "reject" ? "SHOP_REJECTED" :
      action === "ban" ? "SHOP_BANNED" :
      "SHOP_UNBANNED";

    const reason = action === "reject" || action === "ban" ? parsed.data.reason : undefined;

    await prisma.$transaction([
      prisma.shop.update({ where: { id: shopId }, data: { status: newStatus } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: logAction,
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

/** DELETE /api/admin/shops/[shopId] — permanently delete a shop and all its data */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true },
    });
    if (!shop) return err("Shop not found", 404);

    await prisma.$transaction([
      prisma.shop.delete({ where: { id: shopId } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "SHOP_DELETED",
          targetType: "Shop",
          targetId: shopId,
          reason: `Deleted shop: ${shop.name}`,
        },
      }),
    ]);

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
