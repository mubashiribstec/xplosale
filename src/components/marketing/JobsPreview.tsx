import Link from "next/link";
import { prisma } from "@/lib/prisma";
import JobCard from "@/components/shared/JobCard";
import Reveal from "@/components/marketing/Reveal";

export default async function JobsPreview() {
  const jobs = await prisma.jobPosting.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      company: { select: { id: true, name: true, industry: true, verifiedEmployer: true } },
      region: { select: { name: true, city: true } },
      _count: { select: { applications: true } },
    },
  });

  const serialised = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    remoteType: j.remoteType,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    currency: j.currency,
    createdAt: j.createdAt.toISOString(),
    company: j.company,
    region: { name: j.region.name, city: j.region.city },
    _count: j._count,
  }));

  return (
    <section
      style={{
        maxWidth: "var(--maxw)",
        margin: "0 auto",
        padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
      }}
    >
      <Reveal>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ color: "var(--ink)", marginBottom: 12 }}>
              Jobs
            </p>
            <h2 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.03em", margin: 0 }}>
              Open roles from verified employers.
            </h2>
          </div>
          <Link href="/jobs" style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", textDecoration: "none", whiteSpace: "nowrap" }}>
            View all jobs →
          </Link>
        </div>
      </Reveal>

      {serialised.length === 0 ? (
        <Reveal>
          <div
            style={{
              textAlign: "center",
              padding: "56px 20px",
              background: "var(--paper-2)",
              border: "1px dashed var(--line)",
              borderRadius: 20,
            }}
          >
            <p style={{ fontSize: 16, color: "var(--ink-soft)", margin: "0 0 16px" }}>
              No open roles yet — be the first employer to post a job.
            </p>
            <Link
              href="/employer"
              style={{
                display: "inline-flex",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--white)",
                background: "var(--ink)",
                borderRadius: 10,
                padding: "10px 22px",
                textDecoration: "none",
              }}
            >
              Post the first job
            </Link>
          </div>
        </Reveal>
      ) : (
        <div className="x-grid-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {serialised.map((job, i) => (
            <Reveal key={job.id} delay={Math.min(i, 4) * 0.06}>
              <JobCard job={job} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
