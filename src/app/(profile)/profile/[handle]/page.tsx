import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { getUserTier } from "@/lib/tier";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await prisma.networkProfile.findUnique({ where: { handle }, select: { headline: true } });
  return { title: `@${handle}${profile?.headline ? ` — ${profile.headline}` : ""} | Xplosale` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const networkProfile = await prisma.networkProfile.findUnique({
    where: { handle },
    include: {
      user: {
        select: {
          id: true, name: true, image: true, role: true, isPartner: true,
          hasVerifiedBadge: true, verificationStatus: true,
        },
      },
      experiences: { orderBy: { start: "desc" }, take: 5 },
      educations: { orderBy: { start: "desc" }, take: 3 },
      profileSkills: { include: { skill: true } },
    },
  });

  if (!networkProfile || networkProfile.visibility === "CONNECTIONS") notFound();

  const { user } = networkProfile;
  const tier = getUserTier({
    role: user.role,
    isPartner: user.isPartner,
    verificationStatus: user.verificationStatus,
    hasVerifiedBadge: user.hasVerifiedBadge,
  });

  const displayName = user.name ?? `@${handle}`;
  const photo = networkProfile.profilePhotoUrl ?? user.image;
  const avatarLetter = displayName[0]?.toUpperCase() ?? "U";

  const listings = await prisma.listing.findMany({
    where: { sellerProfile: { userId: user.id }, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, title: true, price: true },
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        fontFamily: "var(--body)",
        paddingBottom: 64,
      }}
    >
      {networkProfile.bannerUrl && (
        <div style={{ height: 180, background: `url(${networkProfile.bannerUrl}) center/cover` }} />
      )}
      {!networkProfile.bannerUrl && (
        <div style={{ height: 140, background: "linear-gradient(135deg, var(--clay) 0%, var(--ink) 100%)" }} />
      )}

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px)" }}>
        <div style={{ marginTop: -52, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={displayName} style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid var(--white)" }} />
          ) : (
            <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--clay)", border: "4px solid var(--white)", display: "grid", placeItems: "center", fontSize: 38, fontWeight: 800, color: "var(--white)" }}>
              {avatarLetter}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em", color: "var(--ink)", margin: 0 }}>
              {displayName}
            </h1>
            {(tier === "PARTNER" || tier === "VERIFIED") && (
              <VerifiedBadge size="md" variant={tier === "PARTNER" ? "partner" : "verified"} />
            )}
          </div>
          {networkProfile.headline && (
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "4px 0 0" }}>{networkProfile.headline}</p>
          )}
          {networkProfile.currentRole && (
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "2px 0 0" }}>{networkProfile.currentRole}</p>
          )}
          {networkProfile.location && (
            <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "4px 0 0" }}>📍 {networkProfile.location}</p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {networkProfile.summary && (
            <Card title="About">
              <p style={{ fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.65, margin: 0 }}>{networkProfile.summary}</p>
            </Card>
          )}

          {networkProfile.profileSkills.length > 0 && (
            <Card title="Skills">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {networkProfile.profileSkills.map((ps) => (
                  <span key={ps.skillId} style={{ padding: "5px 12px", borderRadius: 99, background: "var(--paper-2)", border: "1px solid var(--line)", fontSize: 13, fontWeight: 500, color: "var(--ink-soft)" }}>
                    {ps.skill.name}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {networkProfile.experiences.length > 0 && (
            <Card title="Experience">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {networkProfile.experiences.map((exp) => (
                  <div key={exp.id}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "0 0 2px" }}>{exp.title}</p>
                    <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{exp.company}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                      {new Date(exp.start).getFullYear()} – {exp.end ? new Date(exp.end).getFullYear() : "Present"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {networkProfile.educations.length > 0 && (
            <Card title="Education">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {networkProfile.educations.map((edu) => (
                  <div key={edu.id}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: "0 0 2px" }}>{edu.institution}</p>
                    {edu.degree && <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{edu.degree}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {listings.length > 0 && (
            <Card title="Listings">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {listings.map((l) => (
                  <Link key={l.id} href={`/m/${l.id}`} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--white)", textDecoration: "none", display: "block" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.3 }}>{l.title}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>PKR {l.price.toLocaleString()}</p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" }}>
      <h2 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: "0 0 16px" }}>{title}</h2>
      {children}
    </div>
  );
}
