import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/core/adapters/payment";
import { env } from "@/lib/env";

type Params = { params: Promise<{ id: string }> };

/** POST /api/shops/[id]/checkout — create a checkout session to upgrade to PREMIUM */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true, subscription: { select: { status: true, planKey: true } } },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    if (shop.subscription?.status === "ACTIVE" && shop.subscription?.planKey === "PREMIUM") {
      return err("This shop already has an active Premium subscription.", 409);
    }

    const base = env.NEXTAUTH_URL.replace(/\/$/, "");
    const successUrl = `${base}/shops/manage/${shopId}/upgrade/success`;
    const cancelUrl = `${base}/shops/manage/${shopId}/upgrade/cancel`;

    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      shopId,
      planKey: "PREMIUM",
      successUrl,
      cancelUrl,
    });

    return ok({ url: checkout.url, sessionId: checkout.sessionId });
  } catch (e) {
    return parseError(e);
  }
}
