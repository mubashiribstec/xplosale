import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  mode: z.enum(["SUBSCRIPTION", "COMMISSION"]),
});

/**
 * POST /api/shops/[id]/billing-mode — shopkeeper chooses how the shop is billed.
 * COMMISSION grants PREMIUM-level limits with no monthly fee; the platform takes a
 * percentage of every completed order instead.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        ownerUserId: true,
        billingMode: true,
        commissionRate: true,
        subscription: { select: { status: true, planKey: true } },
      },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { mode } = parsed.data;
    if (mode === shop.billingMode) return ok({ billingMode: mode });

    if (mode === "COMMISSION") {
      const paidActive =
        shop.subscription?.status === "ACTIVE" &&
        (shop.subscription.planKey === "PREMIUM" || shop.subscription.planKey === "PROMOTION");
      if (paidActive) {
        return err("Cancel your active paid subscription before switching to commission billing.", 409);
      }
      await prisma.shop.update({
        where: { id: shopId },
        data: {
          billingMode: "COMMISSION",
          // Seed a per-shop rate from the platform default if none is set yet.
          commissionRate: shop.commissionRate ?? env.DEFAULT_COMMISSION_RATE_PCT,
        },
      });
      return ok({ billingMode: "COMMISSION" });
    }

    // Switch back to subscription billing. Any outstanding commission balance remains owed.
    await prisma.shop.update({
      where: { id: shopId },
      data: { billingMode: "SUBSCRIPTION" },
    });
    return ok({ billingMode: "SUBSCRIPTION" });
  } catch (e) {
    return parseError(e);
  }
}
