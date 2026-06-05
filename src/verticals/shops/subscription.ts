import { prisma } from "@/lib/prisma";

const PERIOD_DAYS = 30;

/** Activate or renew a PREMIUM subscription for a shop. */
export async function activateSubscription(
  shopId: string,
  externalRef: string,
  provider: string,
  periodEnd?: Date,
): Promise<void> {
  const end = periodEnd ?? new Date(Date.now() + PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await prisma.subscription.upsert({
    where: { shopId },
    update: {
      planKey: "PREMIUM",
      status: "ACTIVE",
      provider,
      externalRef,
      startedAt: new Date(),
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
    create: {
      shopId,
      planKey: "PREMIUM",
      status: "ACTIVE",
      provider,
      externalRef,
      startedAt: new Date(),
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
    },
  });
}

/**
 * Mark a subscription as cancelled/expired by the payment provider webhook.
 * Hides products that exceed the FREE plan limit immediately.
 * Do NOT call this for user-initiated cancels — use scheduleCancelSubscription instead.
 */
export async function deactivateSubscription(
  shopId: string,
  newStatus: "CANCELLED" | "EXPIRED",
): Promise<void> {
  await prisma.subscription.updateMany({
    where: { shopId },
    data: { status: newStatus },
  });

  const freePlan = await prisma.plan.findUnique({ where: { key: "FREE" } });
  const limit = freePlan?.maxProducts ?? 4;

  const visible = await prisma.shopProduct.findMany({
    where: { shopId, isHidden: false },
    orderBy: { order: "asc" },
    select: { id: true },
    take: limit + 200,
  });

  if (visible.length > limit) {
    const overflowIds = visible.slice(limit).map((p) => p.id);
    await prisma.shopProduct.updateMany({
      where: { id: { in: overflowIds } },
      data: { isHidden: true },
    });
  }
}

/**
 * User-initiated cancel: marks the subscription to cancel at period end.
 * The subscription stays ACTIVE until currentPeriodEnd — users keep access for time paid.
 * The payment provider webhook (subscription.cancelled / subscription.expired) will later
 * call deactivateSubscription to do the actual downgrade.
 */
export async function scheduleCancelSubscription(shopId: string): Promise<void> {
  await prisma.subscription.updateMany({
    where: { shopId, status: "ACTIVE" },
    data: { cancelAtPeriodEnd: true },
  });
}
