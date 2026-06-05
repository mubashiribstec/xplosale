import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/core/adapters/payment";
import { scheduleCancelSubscription } from "@/verticals/shops/subscription";

type Params = { params: Promise<{ id: string }> };

/** POST /api/shops/[id]/subscription/cancel — cancel PREMIUM subscription */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        ownerUserId: true,
        subscription: { select: { status: true, externalRef: true } },
      },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const sub = shop.subscription;
    if (!sub || sub.status !== "ACTIVE") {
      return err("No active subscription to cancel.", 422);
    }

    // Tell the payment provider (no-op for mock)
    if (sub.externalRef) {
      const provider = getPaymentProvider();
      await provider.cancelSubscription(sub.externalRef);
    }

    await scheduleCancelSubscription(shopId);

    return ok({ cancelledAtPeriodEnd: true });
  } catch (e) {
    return parseError(e);
  }
}
