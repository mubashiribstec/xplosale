import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { activateSubscription } from "@/verticals/shops/subscription";

/**
 * GET /api/billing/mock-confirm?session=...&shopId=...&success=...
 * Only active when PAYMENT_MOCK=true. Simulates payment confirmation by
 * activating the subscription directly, then redirecting to the success URL.
 */
export async function GET(req: NextRequest) {
  if (!env.PAYMENT_MOCK) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const sessionId = searchParams.get("session");
  const shopId = searchParams.get("shopId");
  const successUrl = searchParams.get("success");

  if (!sessionId || !shopId || !successUrl) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Validate session ID format: must start with "mock_<shopId>_"
  if (!sessionId.startsWith(`mock_${shopId}_`)) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  try {
    await activateSubscription(shopId, sessionId, "mock");
    return NextResponse.redirect(decodeURIComponent(successUrl));
  } catch {
    return NextResponse.json({ error: "Activation failed" }, { status: 500 });
  }
}
