import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { TierCard } from "@/components/shared/TierCard";
import { getUserTier } from "@/lib/tier";
import { TrustGauge, VerificationSeal } from "@/components/ui/XplosaleUI";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import QuickLinks from "./_quick-links";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as { id: string; phone?: string | null; name?: string | null; role: string };

  const [sellerProfile, jobSeekerProfile, employerProfile, networkProfile, dbUser, connectionCount] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId: user.id } }),
    prisma.jobSeekerProfile.findUnique({ where: { userId: user.id } }),
    prisma.employerProfile.findUnique({ where: { userId: user.id }, include: { company: true } }),
    prisma.networkProfile.findUnique({ where: { userId: user.id } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { verificationStatus: true, hasVerifiedBadge: true, name: true, phone: true, email: true, role: true, isPartner: true, emailVerified: true, createdAt: true },
    }),
    prisma.connection.count({
      where: {
        OR: [
          { requesterId: user.id, status: "ACCEPTED" },
          { recipientId: user.id, status: "ACCEPTED" },
        ],
      },
    }),
  ]);

  const [endorsementCount, listingCount] = await Promise.all([
    networkProfile
      ? prisma.endorsement.count({ where: { receiverProfileId: networkProfile.id } })
      : Promise.resolve(0),
    sellerProfile
      ? prisma.listing.count({ where: { sellerProfileId: sellerProfile.id, status: "ACTIVE" } })
      : Promise.resolve(0),
  ]);

  // New Google users who haven't chosen an account type → setup wizard
  const hasAnyProfile = sellerProfile || jobSeekerProfile || networkProfile;
  const accountIsNew = !hasAnyProfile && dbUser?.email && !dbUser?.phone;
  if (accountIsNew) redirect("/me/setup");

  const tier = getUserTier({
    role: dbUser?.role,
    isPartner: dbUser?.isPartner ?? false,
    verificationStatus: dbUser?.verificationStatus ?? "UNVERIFIED",
    hasVerifiedBadge: dbUser?.hasVerifiedBadge ?? false,
  });

  const displayName = dbUser?.name ?? user.name ?? dbUser?.email ?? user.phone ?? "User";
  const verificationStatus = dbUser?.verificationStatus ?? "UNVERIFIED";
  const emailVerified = !!dbUser?.emailVerified;

  // Compute trust score
  let trustScore = 0;
  if (emailVerified) trustScore += 25;
  if (verificationStatus === "VERIFIED") trustScore += 40;
  else if (verificationStatus === "PENDING") trustScore += 10;
  trustScore += Math.min(20, listingCount * 2);
  trustScore += Math.min(15, endorsementCount * 3);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 8,
            }}
          >
            Account · Trust
          </p>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(32px, 4vw, 48px)",
              color: "var(--ink)",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Your trust, made visible.
          </h1>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: 15,
              color: "var(--ink-soft)",
              marginTop: 10,
              maxWidth: 520,
            }}
          >
            Your verification status, activity, and profile completeness — all in one place.
          </p>
        </div>

        {/* Two-column grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Trust breakdown card */}
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 20,
                padding: "28px 28px 24px",
              }}
            >
              {/* Card header with gauge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--body)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      color: "var(--ink-faint)",
                      marginBottom: 4,
                    }}
                  >
                    Trust score
                  </p>
                  <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
                    Based on verification and activity
                  </p>
                </div>
                <TrustGauge value={trustScore} size={96} />
              </div>

              {/* Breakdown rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* Email */}
                <TrustRow
                  label="Email"
                  status={emailVerified ? "done" : "pending"}
                  detail={emailVerified ? "Confirmed via secure link" : "Not confirmed yet"}
                />

                {/* CNIC/Passport */}
                <TrustRow
                  label="CNIC / Passport"
                  status={
                    verificationStatus === "VERIFIED"
                      ? "done"
                      : verificationStatus === "PENDING"
                      ? "pending"
                      : "none"
                  }
                  detail={
                    verificationStatus === "VERIFIED"
                      ? "Identity verified"
                      : verificationStatus === "PENDING"
                      ? "Under review"
                      : "Not submitted"
                  }
                />

                {/* Listings / Transactions */}
                <TrustRow
                  label="Listings"
                  status="bar"
                  barValue={Math.min(100, listingCount * 10)}
                  detail={`${listingCount} active listing${listingCount !== 1 ? "s" : ""}`}
                />

                {/* Endorsements */}
                <TrustRow
                  label="Endorsements"
                  status="bar"
                  barValue={Math.min(100, endorsementCount * 20)}
                  detail={`${endorsementCount} endorsement${endorsementCount !== 1 ? "s" : ""} received`}
                />
              </div>
            </div>

            {/* Profile facets pills */}
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 20,
                padding: "24px 28px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                  marginBottom: 16,
                }}
              >
                Profile Facets
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <FacetPill
                  label="Marketplace"
                  href="/me/seller"
                  active={!!sellerProfile}
                  detail={`${listingCount} active listing${listingCount !== 1 ? "s" : ""}`}
                />
                <FacetPill
                  label="Jobs"
                  href="/me/job-seeker"
                  active={!!jobSeekerProfile}
                  detail={jobSeekerProfile?.openToWork ? "Open to work" : "Not seeking"}
                />
                <FacetPill
                  label="Network"
                  href="/me/network"
                  active={!!networkProfile}
                  detail={`${connectionCount} connection${connectionCount !== 1 ? "s" : ""}`}
                />
                <FacetPill
                  label="Employer"
                  href="/me/employer"
                  active={!!employerProfile}
                  detail={employerProfile?.company.name ?? "Not set up"}
                />
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Verification card */}
            <div
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 20,
                padding: "24px 24px 20px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                  marginBottom: 14,
                }}
              >
                CNIC Verification
              </p>

              {verificationStatus === "UNVERIFIED" && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {[
                      { label: "CNIC — Front", done: false },
                      { label: "CNIC — Back", done: false },
                      { label: "Selfie", done: false },
                    ].map((slot) => (
                      <div
                        key={slot.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          border: "1.5px dashed var(--line)",
                          borderRadius: 10,
                          background: "var(--paper-2)",
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: "var(--paper-3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--ink-faint)" strokeWidth="1.3" />
                            <circle cx="5" cy="7.5" r="1.5" stroke="var(--ink-faint)" strokeWidth="1.1" />
                            <path d="M8 9.5h4M8 7.5h2" stroke="var(--ink-faint)" strokeWidth="1.1" strokeLinecap="round" />
                          </svg>
                        </div>
                        <span style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-soft)" }}>
                          {slot.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/me/verify-identity"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "10px 16px",
                      background: "var(--clay)",
                      color: "var(--white)",
                      fontFamily: "var(--body)",
                      fontWeight: 600,
                      fontSize: 14,
                      borderRadius: 10,
                      textDecoration: "none",
                    }}
                  >
                    Complete verification →
                  </Link>
                </>
              )}

              {verificationStatus === "PENDING" && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <VerificationSeal size={80} />
                  <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-soft)", marginTop: 12 }}>
                    Your documents are being reviewed. Usually within 24 hours.
                  </p>
                </div>
              )}

              {verificationStatus === "VERIFIED" && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <VerificationSeal size={80} />
                  <div style={{ marginTop: 12 }}>
                    <VerifiedBadge label="CNIC Verified" size="lg" />
                  </div>
                  <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-faint)", marginTop: 10 }}>
                    Your identity has been verified.
                  </p>
                </div>
              )}
            </div>

            {/* Partner / Tier card */}
            <TierCard tier={tier} verificationStatus={verificationStatus} />
          </div>
        </div>

        {/* Quick navigation links */}
        <div
          style={{
            marginTop: 24,
            background: "var(--white)",
            border: "1px solid var(--line)",
            borderRadius: 20,
            padding: "20px 28px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
              marginBottom: 14,
            }}
          >
            Quick Links
          </p>
          <QuickLinks />
        </div>
      </div>
    </main>
  );
}

/* ── Sub-components ── */

function TrustRow({
  label,
  status,
  detail,
  barValue,
}: {
  label: string;
  status: "done" | "pending" | "none" | "bar";
  detail: string;
  barValue?: number;
}) {
  const barColor =
    (barValue ?? 0) >= 60 ? "var(--green)" : (barValue ?? 0) >= 30 ? "var(--blue)" : "var(--clay)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid var(--paper-3)",
      }}
    >
      {/* Icon / indicator */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          background:
            status === "done"
              ? "rgba(14,158,110,.12)"
              : status === "pending"
              ? "rgba(50,122,214,.1)"
              : "var(--paper-3)",
        }}
      >
        {status === "done" && (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6L5 9L10 3" stroke="var(--green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {status === "pending" && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="var(--blue)" strokeWidth="1.3" />
            <path d="M6 3.5V6.5L7.5 8" stroke="var(--blue)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        )}
        {status === "none" && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="var(--ink-faint)" strokeWidth="1.3" />
            <path d="M4 4L8 8M8 4L4 8" stroke="var(--ink-faint)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        )}
        {status === "bar" && (
          <span style={{ fontSize: 10, fontWeight: 700, color: barColor, fontFamily: "var(--body)" }}>
            {barValue ?? 0}
          </span>
        )}
      </div>

      {/* Label + detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--body)", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            {label}
          </span>
          <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
            {detail}
          </span>
        </div>
        {status === "bar" && (
          <div
            style={{
              height: 4,
              borderRadius: 99,
              background: "var(--paper-3)",
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${barValue ?? 0}%`,
                background: barColor,
                borderRadius: 99,
                transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FacetPill({
  label,
  href,
  active,
  detail,
}: {
  label: string;
  href: string;
  active: boolean;
  detail: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "8px 14px 8px 10px",
        background: active ? "rgba(14,158,110,.08)" : "var(--paper-2)",
        border: active ? "1px solid rgba(14,158,110,.25)" : "1px solid var(--line)",
        borderRadius: 999,
        textDecoration: "none",
        transition: "background .15s, border-color .15s",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: active ? "var(--green)" : "var(--ink-faint)",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      <span style={{ fontFamily: "var(--body)", fontSize: 13, fontWeight: 600, color: active ? "var(--green-deep)" : "var(--ink-soft)" }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)" }}>
        {detail}
      </span>
    </Link>
  );
}
