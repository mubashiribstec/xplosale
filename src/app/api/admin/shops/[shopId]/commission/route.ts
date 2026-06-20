import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getCommissionBalance } from "@/verticals/shops/commission";

type Params = { params: Promise<{ shopId: string }> };

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set-rate"), rate: z.number().min(0).max(100) }),
  z.object({ action: z.literal("settle"), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("adjust"), amount: z.number(), note: z.string().min(2).max(500) }),
]);

/**
 * POST /api/admin/shops/[shopId]/commission — admin manages a shop's commission billing.
 *   set-rate: set the per-shop commission percentage
 *   settle:   zero out the outstanding balance (records a SETTLEMENT entry)
 *   adjust:   manual signed correction (records an ADJUSTMENT entry)
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { shopId } = await params;
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
    if (!shop) return err("Shop not found", 404);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const data = parsed.data;

    if (data.action === "set-rate") {
      await prisma.$transaction([
        prisma.shop.update({ where: { id: shopId }, data: { commissionRate: data.rate } }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "SHOP_COMMISSION_RATE_SET",
            targetType: "Shop",
            targetId: shopId,
            reason: `Commission rate set to ${data.rate}%`,
          },
        }),
      ]);
      return ok({ rate: data.rate });
    }

    if (data.action === "settle") {
      const balance = await getCommissionBalance(shopId);
      if (balance <= 0) return err("Nothing to settle — balance is zero.", 422);
      await prisma.$transaction([
        prisma.commissionLedgerEntry.create({
          data: {
            shopId,
            type: "SETTLEMENT",
            amount: -balance,
            note: data.note ?? "Balance settled by admin",
            createdById: adminId,
          },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "SHOP_COMMISSION_SETTLED",
            targetType: "Shop",
            targetId: shopId,
            reason: `Settled commission balance of ${balance.toFixed(2)}`,
          },
        }),
      ]);
      return ok({ settled: balance, balance: 0 });
    }

    // adjust
    await prisma.$transaction([
      prisma.commissionLedgerEntry.create({
        data: {
          shopId,
          type: "ADJUSTMENT",
          amount: data.amount,
          note: data.note,
          createdById: adminId,
        },
      }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "SHOP_COMMISSION_ADJUSTED",
          targetType: "Shop",
          targetId: shopId,
          reason: `Adjustment ${data.amount >= 0 ? "+" : ""}${data.amount}: ${data.note}`,
        },
      }),
    ]);
    const balance = await getCommissionBalance(shopId);
    return ok({ balance });
  } catch (e) {
    return parseError(e);
  }
}
