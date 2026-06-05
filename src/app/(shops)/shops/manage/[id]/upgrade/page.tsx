import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import CheckoutButton from "@/components/shared/shops/CheckoutButton";
import CancelSubscriptionButton from "@/components/shared/shops/CancelSubscriptionButton";
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
      subscription: {
        select: { planKey: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
      },
    },
  });

  if (!shop || shop.ownerUserId !== userId) redirect("/shops/manage");

  const sub = shop.subscription;
  const isPremiumActive = sub?.status === "ACTIVE" && sub?.planKey === "PREMIUM";
  const periodEnd = sub?.currentPeriodEnd;
  const priceMonthly = env.PREMIUM_PRICE_PKR;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href={`/shops/manage/${shopId}`}
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← {shop.name}
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(24px,4vw,34px)", color: "var(--ink)", margin: "0 0 6px" }}>
          {isPremiumActive ? "Your Subscription" : "Upgrade to Premium"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 36px", fontFamily: "var(--body)" }}>
          {isPremiumActive
            ? `Premium active${periodEnd ? ` · renews ${new Date(periodEnd).toLocaleDateString()}` : ""}`
            : "Unlock more products, images, and featured placement."}
        </p>

        {/* Plan comparison */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
          {/* Free */}
          <div style={{
            background: "var(--white)", border: `2px solid ${isPremiumActive ? "var(--line)" : "var(--clay)"}`,
            borderRadius: 18, padding: "22px 20px", fontFamily: "var(--body)",
          }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: "0 0 4px" }}>Free</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 16px" }}>PKR 0</p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {["1 shop", "4 products", "2 images / product", "Basic listing"].map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--ink-soft)" }}>{f}</li>
              ))}
            </ul>
            {!isPremiumActive && (
              <p style={{ fontSize: 12, color: "var(--clay)", fontWeight: 600, margin: "14px 0 0" }}>Current plan</p>
            )}
          </div>

          {/* Premium */}
          <div style={{
            background: isPremiumActive ? "rgba(15,184,126,.04)" : "var(--white)",
            border: `2px solid ${isPremiumActive ? "var(--green)" : "var(--clay)"}`,
            borderRadius: 18, padding: "22px 20px", fontFamily: "var(--body)",
            position: "relative",
          }}>
            {!isPremiumActive && (
              <span style={{
                position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                background: "var(--clay)", color: "var(--white)",
                fontSize: 11, fontWeight: 700, padding: "2px 12px", borderRadius: 99,
              }}>
                RECOMMENDED
              </span>
            )}
            <p style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: "0 0 4px" }}>Premium</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "0 0 16px" }}>
              PKR {priceMonthly.toLocaleString()}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-faint)" }}>/mo</span>
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {["5 shops", "30 products", "5 images / product", "Featured placement", "Analytics dashboard"].map((f) => (
                <li key={f} style={{ fontSize: 13, color: "var(--ink-soft)" }}>{f}</li>
              ))}
            </ul>
            {isPremiumActive && (
              <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, margin: "14px 0 0" }}>✓ Active</p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 24px", fontFamily: "var(--body)" }}>
          {isPremiumActive ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0 }}>Manage Subscription</p>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
                Your Premium subscription is active
                {periodEnd ? ` and renews on ${new Date(periodEnd).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}` : ""}.
              </p>
              <CancelSubscriptionButton shopId={shopId} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0 }}>Upgrade Now</p>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
                PKR {priceMonthly.toLocaleString()} per month. Cancel anytime.
                {" "}Payment is simulated in this environment.
              </p>
              <CheckoutButton shopId={shopId} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
