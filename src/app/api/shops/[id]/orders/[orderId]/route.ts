/**
 * PATCH /api/shops/[id]/orders/[orderId] — shopkeeper updates order status
 * GET   /api/shops/[id]/orders/[orderId] — get single order (owner or customer)
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const SHOPKEEPER_TRANSITIONS: Record<string, string[]> = {
  PENDING:           ["CONFIRMED", "CANCELLED"],
  PAYMENT_SUBMITTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED:         ["PREPARING", "CANCELLED"],
  PREPARING:         ["READY", "CANCELLED"],
  READY:             ["COMPLETED"],
  COMPLETED:         [],
  CANCELLED:         [],
};

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

type Params = { params: Promise<{ id: string; orderId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, orderId } = await params;
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerUserId: true } });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId, shopId },
      select: { status: true },
    });
    if (!order) return err("Order not found", 404);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Invalid status", 422);

    const { status } = parsed.data;
    const allowed = SHOPKEEPER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(status))
      return err(`Cannot transition from ${order.status} to ${status}`, 422);

    const updated = await prisma.shopOrder.update({
      where: { id: orderId },
      data: { status },
      select: { id: true, status: true },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, orderId } = await params;
    const order = await prisma.shopOrder.findUnique({
      where: { id: orderId, shopId },
      include: {
        items: { include: { product: { select: { name: true, images: { take: 1 } } } } },
        shop:  { select: { name: true, ownerUserId: true, bankName: true, bankAccountTitle: true,
                            bankAccountNumber: true, jazzcashNumber: true, easipaisaNumber: true } },
        customer: { select: { name: true, phone: true } },
      },
    });

    if (!order) return err("Order not found", 404);
    if (order.customerId !== userId && order.shop.ownerUserId !== userId)
      return err("Forbidden", 403);

    return ok(order);
  } catch (e) {
    return parseError(e);
  }
}
