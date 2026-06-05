import { type NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/core/adapters/payment";
import { activateSubscription, deactivateSubscription } from "@/verticals/shops/subscription";

/**
 * POST /api/billing/webhook — receive payment provider webhook events.
 * For real providers: verify signature before processing.
 * For mock mode: body is plain JSON (no signature).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") ?? req.headers.get("x-webhook-signature") ?? "";

    const provider = getPaymentProvider();
    const event = await provider.handleWebhook(rawBody, signature);

    if (!event) {
      return NextResponse.json({ ok: false, error: "Unrecognized event" }, { status: 400 });
    }

    switch (event.type) {
      case "subscription.activated":
        await activateSubscription(event.shopId, event.externalRef, "webhook", event.periodEnd);
        break;

      case "subscription.cancelled":
        await deactivateSubscription(event.shopId, "CANCELLED");
        break;

      case "subscription.expired":
      case "subscription.past_due":
        await deactivateSubscription(event.shopId, "EXPIRED");
        break;
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
