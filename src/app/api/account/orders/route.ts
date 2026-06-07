/**
 * GET /api/account/orders — authenticated customer's own order history
 */

import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const customerId = getUserId(session);

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
    const PAGE_SIZE = 20;

    const [orders, total] = await Promise.all([
      prisma.shopOrder.findMany({
        where: { customerId },
        include: {
          items: { take: 3 },
          shop:  { select: { id: true, name: true, slug: true, images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 } } },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.shopOrder.count({ where: { customerId } }),
    ]);

    return ok({ orders, total, page, pages: Math.ceil(total / PAGE_SIZE) || 1 });
  } catch (e) {
    return parseError(e);
  }
}
