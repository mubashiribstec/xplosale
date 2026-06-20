/**
 * Commission billing helpers.
 *
 * A shop can be billed two ways (see Shop.billingMode):
 *   - SUBSCRIPTION: pays a monthly fee (FREE / PREMIUM / PROMOTION plans).
 *   - COMMISSION:   pays nothing monthly but owes the platform a percentage of
 *                   every COMPLETED order. Commission shops get PREMIUM-equivalent
 *                   limits (see tier.ts).
 *
 * Because all order payments are off-platform (cash / bank / JazzCash / Easypaisa
 * paid directly to the shopkeeper), commission cannot be auto-deducted. Instead we
 * keep a ledger of signed entries and the outstanding balance is their sum:
 *   - ACCRUAL    (+) recorded automatically when an order is COMPLETED
 *   - SETTLEMENT (−) recorded by an admin when the shop pays what it owes
 *   - ADJUSTMENT (±) manual correction by an admin
 */

import type { Prisma, PrismaClient, Shop } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

type Tx = Prisma.TransactionClient | PrismaClient;

/** The commission rate (%) in force for a shop — its own rate, else the platform default. */
export function effectiveRate(shop: Pick<Shop, "commissionRate">): number {
  if (shop.commissionRate != null) return Number(shop.commissionRate);
  return env.DEFAULT_COMMISSION_RATE_PCT;
}

/** Outstanding commission a shop owes the platform (sum of all ledger entries). */
export async function getCommissionBalance(shopId: string, client: Tx = prisma): Promise<number> {
  const agg = await client.commissionLedgerEntry.aggregate({
    where: { shopId },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

/**
 * Record a commission accrual for a completed order. Idempotent: the unique
 * orderId constraint means a re-run (or duplicate COMPLETED transition) won't
 * double-charge. Safe to call inside a transaction.
 */
export async function accrueCommissionForOrder(
  client: Tx,
  order: { id: string; shopId: string; totalAmount: Prisma.Decimal | number | string },
  shop: Pick<Shop, "commissionRate">,
): Promise<void> {
  const existing = await client.commissionLedgerEntry.findUnique({
    where: { orderId: order.id },
    select: { id: true },
  });
  if (existing) return;

  const rate = effectiveRate(shop);
  const total = Number(order.totalAmount);
  const amount = Math.round(total * rate) / 100; // rate is a percentage

  await client.commissionLedgerEntry.create({
    data: {
      shopId: order.shopId,
      orderId: order.id,
      type: "ACCRUAL",
      amount,
      rate,
      orderTotal: total,
    },
  });
}
