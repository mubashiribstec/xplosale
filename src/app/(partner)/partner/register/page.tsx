import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

export const metadata = { title: "Become a Partner — Xplosale" };

export default async function PartnerRegisterPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/partner/register");

  const role = (session.user as { role?: string })?.role;
  if (role === "PARTNER" || role === "ADMIN") redirect("/partner");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(32px, 5vw, 52px) clamp(28px, 5vw, 44px)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Badge + heading */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <VerifiedBadge size="lg" variant="partner" label="Verified Partner" />
          <div>
            <h1
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                margin: "0 0 6px",
                lineHeight: 1.15,
              }}
            >
              Become a Partner
            </h1>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
              Agencies, dealers, employers, and serious sellers get the gold badge,
              featured placement, and a dedicated partner dashboard.
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Gold verified-partner badge on all your listings and profile",
            "Featured placement in marketplace and job search results",
            "Partner dashboard with stats, team members, and bulk tools",
            "Unlimited listings and job postings",
          ].map((benefit) => (
            <div key={benefit} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2, color: "#92400e" }} aria-hidden="true">
                <path d="M8 1.5l1.545 3.13 3.455.5-2.5 2.435.59 3.435L8 9.25l-3.09 1.75.59-3.435L3 5.13l3.455-.5L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(217,119,6,.20)" />
              </svg>
              <span style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.4 }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link
            href="/me/partner-application"
            style={{
              width: "100%",
              display: "block",
              textAlign: "center",
              padding: "14px 0",
              background: "var(--clay)",
              color: "var(--white)",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Apply for partner status →
          </Link>
          <Link
            href="/"
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "var(--ink-faint)",
              textDecoration: "none",
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
