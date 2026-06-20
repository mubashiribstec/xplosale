/**
 * Shop order state machine (shopkeeper-driven transitions).
 *
 *   PENDING ──────────▶ CONFIRMED | CANCELLED
 *   PAYMENT_SUBMITTED ─▶ CONFIRMED | CANCELLED
 *   CONFIRMED ────────▶ PREPARING | CANCELLED
 *   PREPARING ────────▶ READY | CANCELLED
 *   READY ────────────▶ COMPLETED
 *   COMPLETED / CANCELLED are terminal.
 *
 * Single source of truth for what a shopkeeper may do to an order. The order
 * API route enforces auth/ownership and calls canTransitionOrder() for the
 * legality check.
 */

import type { OrderStatus } from "@prisma/client";

export const SHOPKEEPER_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  PAYMENT_SUBMITTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Whether a shopkeeper may move an order from `from` to `to`. */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return SHOPKEEPER_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
