import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

export const metadata = { title: "Partner Dashboard — Xplosale" };

export default async function PartnerDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const [dbUser, listingCount, activeJobCount, pendingApplications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true, isPartner: true, partnerType: true, hasVerifiedBadge: true, partnerApplication: { select: { status: true, businessName: true } } },
    }),
    prisma.listing.count({
      where: { sellerProfile: { userId }, status: "ACTIVE" },
    }),
    prisma.jobPosting.count({
      where: { postedByUserId: userId, status: "ACTIVE" },
    }),
    prisma.application.count({
      where: { jobPosting: { postedByUserId: userId }, status: "APPLIED" },
    }),
  ]);

  const displayName = dbUser?.name ?? dbUser?.email ?? "Partner";
  const businessName = dbUser?.partnerApplication?.businessName;
  const isVerifiedPartner = dbUser?.hasVerifiedBadge ?? false;

  const stats = [
    { label: "Active listings", value: listingCount, href: "/partner/listings", cta: "Manage →" },
    { label: "Active jobs", value: activeJobCount, href: "/partner/jobs", cta: "Manage →" },
    { label: "New applications", value: pendingApplications, href: "/me/employer/jobs", cta: "Review →" },
  ];

  return (
    <main>
      {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1
              style={{
                fontFamily: "var(--display)", fontWeight: 800, fontSize: 26,
                letterSpacing: "-0.03em", color: "var(--ink)", margin: 0,
              }}
            >
              {businessName ?? displayName}
            </h1>
            {isVerifiedPartner ? (
              <VerifiedBadge size="md" variant="partner" label="Verified Partner" />
            ) : (
              <span
                style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6,
                  background: "rgba(217,119,6,.08)", color: "#92400e", border: "1px solid rgba(217,119,6,.2)",
                }}
              >
                Partner — pending badge
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
            Partner Dashboard
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/me/listings/new"
            style={{
              padding: "9px 18px", borderRadius: 10, background: "var(--clay)",
              fontSize: 13, fontWeight: 700, color: "var(--white)", textDecoration: "none",
            }}
          >
            + New listing
          </Link>
          <Link
            href="/me/employer/jobs/new"
            style={{
              padding: "9px 18px", borderRadius: 10, border: "1.5px solid var(--line)",
              fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", textDecoration: "none",
              background: "var(--white)",
            }}
          >
            + Post job
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {stats.map(({ label, value, href, cta }) => (
          <div
            key={label}
            style={{
              background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16,
              padding: "22px 22px 18px", display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {label}
            </p>
            <p style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 800, color: "var(--ink)", margin: 0, lineHeight: 1 }}>
              {value}
            </p>
            <Link href={href} style={{ fontSize: 13, color: "var(--clay)", textDecoration: "none", fontWeight: 600 }}>
              {cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" }}>
        <h2 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: "0 0 16px" }}>
          Quick actions
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "My listings", href: "/me/listings" },
            { label: "My jobs", href: "/me/employer/jobs" },
            { label: "Applications", href: "/me/applications" },
            { label: "Identity verification", href: "/me/verify-identity" },
            { label: "Account settings", href: "/me" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line)",
                fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none",
                background: "var(--paper)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
