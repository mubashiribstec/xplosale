/**
 * PaymentProvider interface — provider-agnostic billing adapter.
 * Swap MockPaymentProvider for StripePaymentProvider (or JazzCash/Easypaisa)
 * by changing the PAYMENT_PROVIDER env var and implementing the interface.
 */

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface WebhookEvent {
  type: "subscription.activated" | "subscription.cancelled" | "subscription.past_due" | "subscription.expired";
  eventId: string;
  shopId: string;
  externalRef: string;
  periodEnd?: Date;
}

export interface PaymentProvider {
  createCheckout(opts: {
    shopId: string;
    planKey: "PREMIUM";
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;

  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent | null>;

  cancelSubscription(externalRef: string): Promise<void>;
}

export class MockPaymentProvider implements PaymentProvider {
  async createCheckout(opts: {
    shopId: string;
    planKey: "PREMIUM";
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    const sessionId = `mock_${opts.shopId}_${Date.now()}`;
    const url = `/api/billing/mock-confirm?session=${sessionId}&shopId=${opts.shopId}&success=${encodeURIComponent(opts.successUrl)}`;
    return { sessionId, url };
  }

  async handleWebhook(rawBody: string, _signature: string): Promise<WebhookEvent | null> {
    try {
      const data = JSON.parse(rawBody) as {
        type?: string;
        shopId?: string;
        externalRef?: string;
        periodEnd?: string;
        eventId?: string;
      };
      if (!data.type || !data.shopId || !data.externalRef) return null;
      // Use provided eventId; fall back to a deterministic hash of type+ref+body length
      const eventId = data.eventId ?? `mock_${data.type}_${data.externalRef}_${rawBody.length}`;
      return {
        type: data.type as WebhookEvent["type"],
        eventId,
        shopId: data.shopId,
        externalRef: data.externalRef,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
      };
    } catch {
      return null;
    }
  }

  async cancelSubscription(_externalRef: string): Promise<void> {
    // Mock: no-op — subscription expires at period end
  }
}

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  if (provider === "mock") return new MockPaymentProvider();
  throw new Error(`Payment provider "${provider}" not yet implemented. Set PAYMENT_PROVIDER=mock for development.`);
}
