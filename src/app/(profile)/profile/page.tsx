import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { getUserTier } from "@/lib/tier";

export const metadata = { title: "My Profile — Xplosale" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/profile");

  const user = session.user as { id: string; name?: string | null; image?: string | null; role: string };

  const [dbUser, networkProfile, listings, applications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true, image: true, role: true,
        isPartner: true, hasVerifiedBadge: true, verificationStatus: true,
        createdAt: true,
      },
    }),
    prisma.networkProfile.findUnique({
      where: { userId: user.id },
      include: {
        experiences: { orderBy: { start: "desc" }, take: 3 },
        educations: { orderBy: { start: "desc" }, take: 2 },
        profileSkills: { include: { skill: true }, take: 8 },
      },
    }),
    prisma.listing.findMany({
      where: {
        sellerProfile: { userId: user.id },
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, title: true, price: true, category: true, createdAt: true },
    }),
    prisma.application.findMany({
      where: { jobSeeker: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { jobPosting: { select: { title: true, company: { select: { name: true } } } } },
    }),
  ]);

  if (!dbUser) redirect("/login");

  const tier = getUserTier({
    role: dbUser.role,
    isPartner: dbUser.isPartner,
    verificationStatus: dbUser.verificationStatus,
    hasVerifiedBadge: dbUser.hasVerifiedBadge,
  });

  const displayName = dbUser.name ?? dbUser.email ?? "User";
  const avatarLetter = displayName[0]?.toUpperCase() ?? "U";
  const photo = networkProfile?.profilePhotoUrl ?? dbUser.image;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--body)",
        paddingBottom: 64,
      }}
    >
      {/* Banner */}
      {networkProfile?.bannerUrl && (
        <div
          style={{
            height: 180,
            background: `url(${networkProfile.bannerUrl}) center/cover`,
          }}
        />
      )}
      {!networkProfile?.bannerUrl && (
        <div style={{ height: 140, background: "linear-gradient(135deg, var(--clay) 0%, var(--ink) 100%)" }} />
      )}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px)" }}>
        {/* Avatar + name row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: -52,
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={displayName}
              style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid var(--white)" }}
            />
          ) : (
            <div
              style={{
                width: 100, height: 100, borderRadius: "50%", background: "var(--clay)",
                border: "4px solid var(--white)", display: "grid", placeItems: "center",
                fontSize: 38, fontWeight: 800, color: "var(--white)",
              }}
            >
              {avatarLetter}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/profile/edit"
              style={{
                padding: "9px 20px", borderRadius: 10, border: "1.5px solid var(--line)",
                fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none",
                background: "var(--white)",
              }}
            >
              Edit profile
            </Link>
          </div>
        </div>

        {/* Name, badge, headline */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h1
              style={{
                fontFamily: "var(--display)", fontWeight: 800, fontSize: 26,
                letterSpacing: "-0.03em", color: "var(--ink)", margin: 0,
              }}
            >
              {displayName}
            </h1>
            {(tier === "PARTNER" || tier === "VERIFIED") && (
              <VerifiedBadge
                size="md"
                variant={tier === "PARTNER" ? "partner" : "verified"}
              />
            )}
          </div>
          {networkProfile?.headline && (
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "4px 0 0" }}>
              {networkProfile.headline}
            </p>
          )}
          {networkProfile?.currentRole && (
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "2px 0 0" }}>
              {networkProfile.currentRole}
            </p>
          )}
          {networkProfile?.location && (
            <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "4px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M8 1C5.8 1 4 2.8 4 5c0 3.5 4 9 4 9s4-5.5 4-9c0-2.2-1.8-4-4-4z" strokeLinejoin="round" />
                <circle cx="8" cy="5" r="1.5" />
              </svg>
              {networkProfile.location}
            </p>
          )}
          {tier === "BASIC" && (
            <div style={{ marginTop: 10 }}>
              <Link
                href="/me/verify-identity"
                style={{
                  fontSize: 13, fontWeight: 600, color: "var(--green-deep)",
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4,
                }}
              >
                Get verified →
              </Link>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          {/* Summary */}
          {networkProfile?.summary && (
            <Section title="About">
              <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.65, margin: 0 }}>
                {networkProfile.summary}
              </p>
            </Section>
          )}

          {/* Skills */}
          {(networkProfile?.profileSkills?.length ?? 0) > 0 && (
            <Section title="Skills">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {networkProfile!.profileSkills.map((ps) => (
                  <span
                    key={ps.skillId}
                    style={{
                      padding: "5px 12px", borderRadius: 99, background: "var(--paper-2)",
                      border: "1px solid var(--line)", fontSize: 13, fontWeight: 500,
                      color: "var(--ink-soft)",
                    }}
                  >
                    {ps.skill.name}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Experience */}
          {(networkProfile?.experiences?.length ?? 0) > 0 && (
            <Section title="Experience">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {networkProfile!.experiences.map((exp) => (
                  <div key={exp.id}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "0 0 2px" }}>{exp.title}</p>
                    <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 2px" }}>{exp.company}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                      {new Date(exp.start).getFullYear()} – {exp.end ? new Date(exp.end).getFullYear() : "Present"}
                    </p>
                    {exp.description && (
                      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "6px 0 0", lineHeight: 1.5 }}>
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {(networkProfile?.educations?.length ?? 0) > 0 && (
            <Section title="Education">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {networkProfile!.educations.map((edu) => (
                  <div key={edu.id}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "0 0 2px" }}>{edu.institution}</p>
                    {edu.degree && <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{edu.degree}</p>}
                    <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                      {new Date(edu.start).getFullYear()} – {edu.end ? new Date(edu.end).getFullYear() : "Present"}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Listings */}
          {listings.length > 0 && (
            <Section title="Active listings" action={{ label: "View all →", href: "/me/listings" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/m/${l.id}`}
                    style={{
                      padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)",
                      background: "var(--white)", textDecoration: "none", display: "block",
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.3 }}>
                      {l.title}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                      PKR {l.price.toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* Job applications */}
          {applications.length > 0 && (
            <Section title="Recent applications" action={{ label: "View all →", href: "/me/applications" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {applications.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      padding: "10px 14px", borderRadius: 10, border: "1px solid var(--line)",
                      background: "var(--white)", display: "flex", justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                        {a.jobPosting.title}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                        {a.jobPosting.company.name}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                        background: "var(--paper-2)", color: "var(--ink-soft)",
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {!networkProfile && listings.length === 0 && applications.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-faint)" }}>
              <p style={{ fontSize: 15, marginBottom: 12 }}>Your profile is empty.</p>
              <Link href="/profile/edit" style={{ fontSize: 14, fontWeight: 600, color: "var(--clay)", textDecoration: "none" }}>
                Complete your profile →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: "20px 22px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--display)",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        {action && (
          <Link
            href={action.href}
            style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none", fontWeight: 600 }}
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
