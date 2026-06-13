import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import JobCard from "@/components/shared/JobCard";

export const metadata: Metadata = {
  title: "Saved Jobs — Xplosale",
  robots: { index: false, follow: false },
};

export default async function FavouriteJobsPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/me/favourite-jobs");
  const userId = getUserId(session);

  const favourites = await prisma.jobFavourite.findMany({
    where: { userId, jobPosting: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      jobPosting: {
        include: {
          company: { select: { id: true, name: true, industry: true, verifiedEmployer: true } },
          region: { select: { name: true, city: true } },
          _count: { select: { applications: true } },
        },
      },
    },
  });

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "var(--ink)", margin: "0 0 6px" }}>
          Saved Jobs
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 28px" }}>
          {favourites.length} job{favourites.length !== 1 ? "s" : ""} saved
        </p>

        {favourites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🤍</p>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "0 0 16px" }}>
              No saved jobs yet. Tap the heart on any job to save it here.
            </p>
            <Link
              href="/jobs"
              style={{
                padding: "10px 24px", background: "var(--clay)", color: "var(--white)",
                borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none",
              }}
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {favourites.map((f) => (
              <JobCard
                key={f.jobPostingId}
                job={{
                  id: f.jobPosting.id,
                  title: f.jobPosting.title,
                  remoteType: f.jobPosting.remoteType,
                  salaryMin: f.jobPosting.salaryMin,
                  salaryMax: f.jobPosting.salaryMax,
                  currency: f.jobPosting.currency,
                  createdAt: f.jobPosting.createdAt,
                  company: f.jobPosting.company,
                  region: f.jobPosting.region,
                  _count: f.jobPosting._count,
                }}
                favourited
                isAuthenticated
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
