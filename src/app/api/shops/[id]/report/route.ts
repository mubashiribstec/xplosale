/**
 * POST /api/shops/[id]/report — authenticated user reports a shop
 * Rate-limited: 3 reports per user per 24h.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  reason:  z.enum(["FRAUD", "FAKE_PRODUCTS", "MISLEADING", "INAPPROPRIATE", "SPAM", "OTHER"]),
  details: z.string().max(500).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const reporterId = getUserId(session);

    const { id: shopId } = await params;

    const limit = await rateLimit(`shop-report:${reporterId}`, 3, 24 * 60 * 60);
    if (!limit.allowed) return err("Too many reports. Please wait 24 hours.", 429);

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true, status: true },
    });
    if (!shop || shop.status === "SUSPENDED") return err("Shop not found", 404);
    if (shop.ownerUserId === reporterId) return err("You cannot report your own shop", 422);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const report = await prisma.shopReport.create({
      data: { shopId, reporterId, reason: parsed.data.reason, details: parsed.data.details ?? null },
      select: { id: true },
    });

    return ok(report, 201);
  } catch (e) {
    return parseError(e);
  }
}
