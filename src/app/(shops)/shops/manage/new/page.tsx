import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { getEffectivePlanForUser, countActiveShopsForUser } from "@/verticals/shops/tier";
import ShopWizard from "@/components/shared/shops/ShopWizard";
import UpgradePrompt from "@/components/shared/shops/UpgradePrompt";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NewShopPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/shops/manage/new");
  const userId = getUserId(session);

  const [plan, shopCount] = await Promise.all([
    getEffectivePlanForUser(userId),
    countActiveShopsForUser(userId),
  ]);

  const atLimit = shopCount >= plan.maxShops;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href="/shops/manage"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← My Shops
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(26px,4vw,36px)", color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.1 }}>
          Create a Shop
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 36px", fontFamily: "var(--body)" }}>
          Set up your shop in 4 quick steps — it takes about 3 minutes. Your progress is saved automatically.
        </p>

        {atLimit ? (
          <UpgradePrompt
            message={
              plan.key === "FREE"
                ? "Free accounts can only have 1 shop. Upgrade to Premium to create up to 5 shops."
                : `Your plan allows a maximum of ${plan.maxShops} shops.`
            }
          />
        ) : (
          <div
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              borderRadius: 20,
              padding: "clamp(24px,4vw,40px)",
            }}
          >
            <ShopWizard />
          </div>
        )}
      </div>
    </main>
  );
}
