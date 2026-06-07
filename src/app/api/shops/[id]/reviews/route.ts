/**
 * GET  /api/shops/[id]/reviews — public paginated reviews
 * POST /api/shops/[id]/reviews — authenticated customer with COMPLETED order
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body:   z.string().max(1000).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: shopId } = await params;
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const PAGE_SIZE = 20;

    const [reviews, total] = await Promise.all([
      prisma.shopReview.findMany({
        where: { shopId },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.shopReview.count({ where: { shopId } }),
    ]);

    const avg = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

    return ok({ reviews, total, page, pages: Math.ceil(total / PAGE_SIZE) || 1, averageRating: avg });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const authorId = getUserId(session);

    const { id: shopId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true, status: true },
    });
    if (!shop || shop.status !== "ACTIVE") return err("Shop not found", 404);
    if (shop.ownerUserId === authorId) return err("You cannot review your own shop", 422);

    // Gate: must have a COMPLETED order for this shop
    const completedOrder = await prisma.shopOrder.findFirst({
      where: { shopId, customerId: authorId, status: "COMPLETED" },
      select: { id: true },
    });
    if (!completedOrder)
      return err("You can only review shops where you have a completed order", 403);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const review = await prisma.shopReview.upsert({
      where:  { shopId_authorId: { shopId, authorId } },
      update: { rating: parsed.data.rating, body: parsed.data.body ?? null },
      create: {
        shopId, authorId,
        orderId: completedOrder.id,
        rating:  parsed.data.rating,
        body:    parsed.data.body ?? null,
      },
      select: { id: true, rating: true },
    });

    return ok(review, 201);
  } catch (e) {
    return parseError(e);
  }
}
