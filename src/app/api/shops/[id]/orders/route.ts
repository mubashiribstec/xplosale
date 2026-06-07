/**
 * POST /api/shops/[id]/orders — customer places an order
 * GET  /api/shops/[id]/orders — shopkeeper lists their orders (paginated)
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom, publishMessage } from "@/core/messaging/rooms";

const itemSchema = z.object({
  productId: z.string().cuid(),
  quantity:  z.number().int().min(1).max(100),
});

const createSchema = z.object({
  items:           z.array(itemSchema).min(1).max(20),
  deliveryType:    z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddress: z.string().max(500).optional(),
  paymentMethod:   z.enum(["CASH", "BANK_TRANSFER", "JAZZCASH", "EASYPAISA"]),
  customerNote:    z.string().max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const customerId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true, ownerUserId: true, status: true,
        acceptsCash: true, acceptsDelivery: true,
        bankAccountNumber: true, jazzcashNumber: true, easipaisaNumber: true,
      },
    });

    if (!shop || shop.status !== "ACTIVE") return err("Shop not found", 404);
    if (shop.ownerUserId === customerId) return err("You cannot order from your own shop", 422);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { items, deliveryType, deliveryAddress, paymentMethod, customerNote } = parsed.data;

    // Validate delivery
    if (deliveryType === "DELIVERY" && !shop.acceptsDelivery)
      return err("This shop does not offer delivery", 422);
    if (deliveryType === "DELIVERY" && !deliveryAddress)
      return err("Delivery address is required", 422);

    // Validate payment method availability
    if (paymentMethod === "CASH" && !shop.acceptsCash)
      return err("This shop does not accept cash", 422);
    if (paymentMethod === "BANK_TRANSFER" && !shop.bankAccountNumber)
      return err("This shop has not set up bank transfer details", 422);
    if (paymentMethod === "JAZZCASH" && !shop.jazzcashNumber)
      return err("This shop has not set up JazzCash details", 422);
    if (paymentMethod === "EASYPAISA" && !shop.easipaisaNumber)
      return err("This shop has not set up EasyPaisa details", 422);

    // Fetch products and compute total
    const productIds = items.map((i) => i.productId);
    const products = await prisma.shopProduct.findMany({
      where: { id: { in: productIds }, shopId, isHidden: false, inStock: true },
      select: { id: true, name: true, priceMin: true },
    });

    if (products.length !== productIds.length)
      return err("One or more products are unavailable", 422);

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const price = Number(product.priceMin ?? 0);
      totalAmount += price * item.quantity;
      return {
        productId: item.productId,
        name:          product.name,
        priceSnapshot: product.priceMin ?? 0,
        quantity:      item.quantity,
      };
    });

    const order = await prisma.shopOrder.create({
      data: {
        shopId,
        customerId,
        deliveryType,
        paymentMethod,
        deliveryAddress: deliveryAddress ?? null,
        customerNote:    customerNote ?? null,
        totalAmount,
        currency: "PKR",
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Fire-and-forget: send a SYSTEM message to the SHOP_INQUIRY chat thread
    void (async () => {
      try {
        const [pA, pB] = [customerId, shop.ownerUserId].sort();
        const room = await getOrCreateRoom("SHOP_INQUIRY", shopId, pA, pB);
        const PM: Record<string, string> = { CASH: "Cash", BANK_TRANSFER: "Bank Transfer", JAZZCASH: "JazzCash", EASYPAISA: "EasyPaisa" };
        const DT: Record<string, string> = { PICKUP: "Pickup", DELIVERY: "Delivery" };
        const lines = orderItems.map((i) => `• ${i.quantity}× ${i.name} — PKR ${(Number(i.priceSnapshot) * i.quantity).toLocaleString()}`).join("\n");
        const body = `🛒 New order placed!\n${lines}\nDelivery: ${DT[deliveryType] ?? deliveryType} · Payment: ${PM[paymentMethod] ?? paymentMethod}\nTotal: PKR ${totalAmount.toLocaleString()}\nOrder ID: ${order.id}`;
        const msg = await prisma.message.create({
          data: { roomId: room.id, senderId: customerId, body, kind: "SYSTEM" },
          include: { sender: { select: { id: true, name: true } } },
        });
        await publishMessage(room.id, msg);
      } catch {
        // Non-fatal — order is created regardless
      }
    })();

    return ok(order, 201);
  } catch (e) {
    return parseError(e);
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerUserId: true } });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const statusFilter = req.nextUrl.searchParams.get("status") ?? "";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const PAGE_SIZE = 20;

    const where = {
      shopId,
      ...(statusFilter ? { status: statusFilter as "PENDING" } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.shopOrder.findMany({
        where,
        include: {
          items: { include: { product: { select: { name: true } } } },
          customer: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.shopOrder.count({ where }),
    ]);

    return ok({ orders, total, page, pages: Math.ceil(total / PAGE_SIZE) });
  } catch (e) {
    return parseError(e);
  }
}
