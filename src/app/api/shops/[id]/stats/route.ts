import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/verticals/shops/tier";

type Params = { params: Promise<{ id: string }> };

/** GET /api/shops/[id]/stats — at-a-glance dashboard numbers for the shop owner. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerUserId: true } });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [plan, pending, inProgress, todayOrders, todaySales, products] = await Promise.all([
      getEffectivePlan(shopId),
      prisma.shopOrder.count({ where: { shopId, status: { in: ["PENDING", "PAYMENT_SUBMITTED"] } } }),
      prisma.shopOrder.count({ where: { shopId, status: { in: ["CONFIRMED", "PREPARING", "READY"] } } }),
      prisma.shopOrder.count({ where: { shopId, createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } } }),
      prisma.shopOrder.aggregate({
        where: { shopId, createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      }),
      prisma.shopProduct.count({ where: { shopId, isHidden: false } }),
    ]);

    let views: number | null = null;
    if (plan.analytics) {
      const agg = await prisma.shopAnalyticsEvent.aggregate({
        where: { shopId, kind: "VIEW", day: { gte: thirtyDaysAgo } },
        _sum: { count: true },
      });
      views = agg._sum.count ?? 0;
    }

    return ok({
      pending,
      inProgress,
      todayOrders,
      todaySales: Number(todaySales._sum.totalAmount ?? 0),
      products,
      views, // null when analytics aren't on the plan
    });
  } catch (e) {
    return parseError(e);
  }
}
