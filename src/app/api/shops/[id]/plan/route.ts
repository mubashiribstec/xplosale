import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/verticals/shops/tier";

type Params = { params: Promise<{ id: string }> };

/** GET /api/shops/[id]/plan — return the effective plan for a shop (owner only) */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const plan = await getEffectivePlan(shopId);
    return ok(plan);
  } catch (e) {
    return parseError(e);
  }
}
