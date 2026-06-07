/**
 * Shop tier enforcement helpers.
 * All limits are read from the Plan table — never hardcoded here.
 * Every create/upload path must call these server-side before writing.
 */

import { prisma } from "@/lib/prisma";
import type { PlanKey } from "@prisma/client";

export interface EffectivePlan {
  key: PlanKey;
  maxShops: number;
  maxProducts: number;
  maxImagesPerProduct: number;
  featuredPlacement: boolean;
  analytics: boolean;
  customBanner: boolean;
  isPromotion: boolean;
}

/** Returns the active plan for a shop, defaulting to FREE if no active subscription. */
export async function getEffectivePlan(shopId: string): Promise<EffectivePlan> {
  const [sub, freePlan] = await Promise.all([
    prisma.subscription.findUnique({
      where: { shopId },
      select: { planKey: true, status: true, currentPeriodEnd: true },
    }),
    prisma.plan.findUnique({ where: { key: "FREE" } }),
  ]);

  if (!freePlan) throw new Error("Plan table not seeded — run prisma db seed");

  const now = new Date();
  const isPaidActive =
    sub?.status === "ACTIVE" &&
    (sub.planKey === "PREMIUM" || sub.planKey === "PROMOTION") &&
    (sub.currentPeriodEnd == null || sub.currentPeriodEnd > now);
  if (!isPaidActive) return { ...freePlan, isPromotion: false } as EffectivePlan;

  const paidPlan = await prisma.plan.findUnique({ where: { key: sub!.planKey } });
  return { ...(paidPlan ?? freePlan), isPromotion: sub!.planKey === "PROMOTION" } as EffectivePlan;
}

/** Returns the effective plan for a user (based on their shops' subscriptions). */
export async function getEffectivePlanForUser(userId: string): Promise<EffectivePlan> {
  const now = new Date();
  const [sub, freePlan] = await Promise.all([
    prisma.subscription.findFirst({
      where: {
        shop: { ownerUserId: userId },
        status: "ACTIVE",
        planKey: { in: ["PREMIUM", "PROMOTION"] },
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
      },
      select: { planKey: true },
    }),
    prisma.plan.findUnique({ where: { key: "FREE" } }),
  ]);

  if (!freePlan) throw new Error("Plan table not seeded — run prisma db seed");

  if (!sub) return { ...freePlan, isPromotion: false } as EffectivePlan;

  const paidPlan = await prisma.plan.findUnique({ where: { key: sub.planKey } });
  return { ...(paidPlan ?? freePlan), isPromotion: sub.planKey === "PROMOTION" } as EffectivePlan;
}

/** Count shops owned by a user that count against the maxShops limit. */
export async function countActiveShopsForUser(userId: string): Promise<number> {
  return prisma.shop.count({
    where: {
      ownerUserId: userId,
      status: { notIn: ["REJECTED", "SUSPENDED"] },
    },
  });
}

/** Generates a URL-safe slug from a shop name + timestamp suffix for uniqueness. */
export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}
