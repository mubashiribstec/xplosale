import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import CheckoutButton from "@/components/shared/shops/CheckoutButton";
import CancelSubscriptionButton from "@/components/shared/shops/CancelSubscriptionButton";
import BillingModeSwitch from "@/components/shared/shops/BillingModeSwitch";
import { env } from "@/lib/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UpgradePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { id: shopId } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      ownerUserId: true,
      name: true,
      billingMode: true,
      subscription: {
        select: { planKey: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      },
    },
  });

  if (!shop || shop.ownerUserId !== userId) redirect("/shops/manage");

  const sub = shop.subscription;
  const activePlanKey = sub?.status === "ACTIVE" ? sub.planKey : "FREE";
  const hasActivePaidSub = sub?.status === "ACTIVE" && (sub.planKey === "PREMIUM" || sub.planKey === "PROMOTION");
  const isCommission = shop.billingMode === "COMMISSION";
  const periodEnd = sub?.currentPeriodEnd;
  const priceMonthly = env.PREMIUM_PRICE_PKR;
  const promotionPrice = Math.round(priceMonthly * 5 / 3); // ~PKR 2500 if premium is PKR 1500

  const plans = [
    {
      key: "FREE",
      label: "Free",
      price: "PKR 0",
      priceSub: null,
      badge: null,
      features: ["1 shop", "2 products", "2 images / product", "Basic listing"],
      accent: "var(--line)",
      highlight: false,
    },
    {
      key: "PREMIUM",
      label: "Premium",
      price: `PKR ${priceMonthly.toLocaleString()}`,
      priceSub: "/mo",
      badge: "POPULAR",
      features: ["5 shops", "30 products", "5 images / product", "Featured placement", "Analytics dashboard"],
      accent: "var(--clay)",
      highlight: true,
    },
    {
      key: "PROMOTION",
      label: "Promotion",
      price: `PKR ${promotionPrice.toLocaleString()}`,
      priceSub: "/mo",
      badge: "🔥 TOP",
      features: [
        "5 shops", "50 products", "8 images / product",
        "Featured placement", "Analytics dashboard",
        "Top placement in category & home (sorted above Premium for users who browsed your category)",
      ],
      accent: "#7c3aed",
      highlight: false,
    },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <Link
          href={`/shops/manage/${shopId}`}
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← {shop.name}
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(24px,4vw,34px)", color: "var(--ink)", margin: "0 0 6px" }}>
          {isCommission ? "Your Billing" : activePlanKey !== "FREE" ? "Your Subscription" : "Choose a Plan"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 36px", fontFamily: "var(--body)" }}>
          {isCommission
            ? "You're on commission billing — Premium features with no monthly fee."
            : activePlanKey !== "FREE"
            ? `${activePlanKey === "PROMOTION" ? "Promotion" : "Premium"} plan active${periodEnd ? ` · renews ${new Date(periodEnd).toLocaleDateString()}` : ""}`
            : "Unlock more products, images, and featured placement — pay monthly or by commission."}
        </p>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
          {plans.map((plan) => {
            const isCurrent = activePlanKey === plan.key;
            return (
              <div
                key={plan.key}
                style={{
                  background: isCurrent ? "rgba(15,184,126,.04)" : "var(--white)",
                  border: `2px solid ${isCurrent ? "var(--green)" : plan.accent}`,
                  borderRadius: 18, padding: "22px 20px", fontFamily: "var(--body)",
                  position: "relative",
                }}
              >
                {plan.badge && !isCurrent && (
                  <span style={{
                    position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                    background: plan.key === "PROMOTION" ? "#7c3aed" : "var(--clay)", color: "var(--white)",
                    fontSize: 11, fontWeight: 700, padding: "2px 12px", borderRadius: 99, whiteSpace: "nowrap",
                  }}>
                    {plan.badge}
                  </span>
                )}
                <p style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: "0 0 4px" }}>{plan.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 16px" }}>
                  {plan.price}
                  {plan.priceSub && <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-faint)" }}>{plan.priceSub}</span>}
                </p>
                <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: 13, color: "var(--ink-soft)" }}>{f}</li>
                  ))}
                </ul>
                {isCurrent && (
                  <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, margin: "14px 0 0" }}>✓ Current plan</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Promotion info box */}
        <div style={{
          background: "rgba(124,58,237,.05)", border: "1px solid rgba(124,58,237,.2)",
          borderRadius: 14, padding: "14px 18px", marginBottom: 24, fontFamily: "var(--body)",
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#7c3aed", margin: "0 0 4px" }}>🔥 About Top Placement</p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
            Promotion shops appear at the top of the directory and category pages for users who have browsed your category. This interest-based surfacing gives you visibility exactly when buyers are looking for what you sell.
          </p>
        </div>

        {/* Subscription CTA — hidden while on commission billing */}
        {!isCommission && (
          <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 24px", fontFamily: "var(--body)", marginBottom: 16 }}>
            {activePlanKey !== "FREE" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0 }}>Manage Subscription</p>
                <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
                  Your {activePlanKey === "PROMOTION" ? "Promotion" : "Premium"} subscription is active
                  {periodEnd ? ` and renews on ${new Date(periodEnd).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
                </p>
                <CancelSubscriptionButton shopId={shopId} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0 }}>Upgrade Now</p>
                <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
                  PKR {priceMonthly.toLocaleString()} / month for Premium · PKR {promotionPrice.toLocaleString()} / month for Promotion.
                  {" "}Cancel anytime. Payment is simulated in this environment.
                </p>
                <CheckoutButton shopId={shopId} />
              </div>
            )}
          </div>
        )}

        {/* Commission billing — alternative to a monthly subscription */}
        <BillingModeSwitch shopId={shopId} hasActivePaidSub={!!hasActivePaidSub} />
      </div>
    </main>
  );
}
