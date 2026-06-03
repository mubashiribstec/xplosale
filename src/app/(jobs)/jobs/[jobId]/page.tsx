import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import ApplyButton from "@/components/shared/ApplyButton";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

export async function generateMetadata(
  { params }: { params: Promise<{ jobId: string }> }
): Promise<Metadata> {
  const { jobId } = await params;
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: {
      title: true, description: true,
      salaryMin: true, salaryMax: true, currency: true, remoteType: true,
      company: { select: { name: true } },
      region: { select: { name: true, city: true } },
    },
  });
  if (!job) return { title: "Job not found" };

  const salaryText = job.salaryMin && job.salaryMax
    ? ` · ${job.currency} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`
    : "";
  const description = `${job.company.name} · ${job.region.city}, ${job.region.name}${salaryText} · ${job.description?.slice(0, 120) ?? ""}`;

  return {
    title: `${job.title} at ${job.company.name} | Xplosale Jobs`,
    description,
    openGraph: { title: `${job.title} at ${job.company.name}`, description, type: "website" },
    twitter: { card: "summary", title: `${job.title} at ${job.company.name}`, description },
  };
}

const LOGO_COLORS = [
  "#327AD6", "#9025B3", "#A04E37", "#0E9E6E", "#1F56B0", "#6E1A8A",
];

function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

function CompanyLogoLg({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = hashColor(name);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#FBFAF5",
        fontFamily: "var(--body)",
        fontWeight: 700,
        fontSize: size * 0.32,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

function MetaPill({
  children,
  icon,
  color,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: 99,
        background: "var(--paper-2)",
        border: "1px solid var(--line)",
        fontFamily: "var(--body)",
        fontSize: 12,
        fontWeight: 500,
        color: color ?? "var(--ink-soft)",
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

const REMOTE_CHIP_STYLE: Record<string, { bg: string; color: string }> = {
  ONSITE: { bg: "rgba(160,78,55,.10)", color: "var(--clay)" },
  HYBRID: { bg: "rgba(50,122,214,.10)", color: "var(--blue)" },
  REMOTE: { bg: "rgba(14,158,110,.10)", color: "var(--green)" },
};

function daysAgo(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const session = await getSession();
  const userId = session ? getUserId(session) : null;
  const isAdmin = session
    ? (session.user as unknown as { role: string }).role === "ADMIN"
    : false;

  const [job, jobSeekerProfileRaw] = await Promise.all([
    prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        region: true,
        _count: { select: { applications: true } },
      },
    }),
    userId ? prisma.jobSeekerProfile.findUnique({ where: { userId } }) : null,
  ]);

  if (!job) notFound();

  const isOwner = userId === job.postedByUserId;

  if (job.status !== "ACTIVE" && !isOwner && !isAdmin) {
    notFound();
  }

  const isJobSeeker = !!jobSeekerProfileRaw;

  const hasSalary = job.salaryMin != null || job.salaryMax != null;
  const salaryLabel = hasSalary
    ? `₨ ${((job.salaryMin ?? 0) / 100000).toFixed(0)} – ${((job.salaryMax ?? 0) / 100000).toFixed(0)} L /month`
    : "Salary not disclosed";

  const remoteChip = REMOTE_CHIP_STYLE[job.remoteType] ?? { bg: "var(--paper-2)", color: "var(--ink-soft)" };
  const remoteLabel = job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase();

  // Similar jobs
  const similarJobs = await prisma.jobPosting.findMany({
    where: {
      status: "ACTIVE",
      id: { not: job.id },
      companyId: job.companyId,
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      region: { select: { city: true, name: true } },
    },
  });

  const requiredSkills = Array.isArray(job.requiredSkills)
    ? (job.requiredSkills as string[])
    : [];

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JobPosting",
            title: job.title,
            description: job.description,
            datePosted: job.createdAt.toISOString(),
            validThrough: job.expiresAt?.toISOString(),
            employmentType: job.remoteType === "REMOTE" ? "TELECOMMUTE" : "FULL_TIME",
            hiringOrganization: {
              "@type": "Organization",
              name: job.company.name,
            },
            jobLocation: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                addressLocality: job.region.city,
                addressCountry: "PK",
              },
            },
            ...(job.salaryMin && job.salaryMax ? {
              baseSalary: {
                "@type": "MonetaryAmount",
                currency: job.currency,
                value: {
                  "@type": "QuantitativeValue",
                  minValue: job.salaryMin,
                  maxValue: job.salaryMax,
                  unitText: "MONTH",
                },
              },
            } : {}),
          }),
        }}
      />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-faint)" }}>
          <Link href="/jobs" style={{ color: "var(--ink-faint)", textDecoration: "none" }}>Jobs</Link>
          <span>/</span>
          <Link href={`/companies/${job.companyId}`} style={{ color: "var(--ink-faint)", textDecoration: "none" }}>{job.company.name}</Link>
          <span>/</span>
          <span style={{ color: "var(--ink-soft)" }}>{job.title}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 24, alignItems: "start" }}>
          {/* Left col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Job header card */}
            <div
              style={{
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: 18,
                padding: "24px 24px 20px",
              }}
            >
              {/* Company row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <CompanyLogoLg name={job.company.name} size={48} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Link
                      href={`/companies/${job.companyId}`}
                      style={{
                        fontFamily: "var(--body)",
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--ink)",
                        textDecoration: "none",
                      }}
                    >
                      {job.company.name}
                    </Link>
                    {job.company.verifiedEmployer && <VerifiedBadge size="sm" label="Verified Employer" />}
                  </div>
                  {job.company.industry && (
                    <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                      {job.company.industry}
                    </p>
                  )}
                </div>
              </div>

              {/* Job title */}
              <h1
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: 28,
                  color: "var(--ink)",
                  lineHeight: 1.15,
                  margin: "0 0 16px",
                }}
              >
                {job.title}
              </h1>

              {/* Meta pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                <MetaPill
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  }
                >
                  {job.region.city || job.region.name}
                </MetaPill>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "5px 12px",
                    borderRadius: 99,
                    background: remoteChip.bg,
                    fontFamily: "var(--body)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: remoteChip.color,
                    letterSpacing: ".04em",
                  }}
                >
                  {remoteLabel}
                </span>

                {hasSalary && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "5px 12px",
                      borderRadius: 99,
                      background: "rgba(160,78,55,.08)",
                      fontFamily: "var(--display)",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--clay)",
                    }}
                  >
                    {salaryLabel}
                  </span>
                )}

                <MetaPill
                  icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  }
                >
                  {daysAgo(job.createdAt)}
                </MetaPill>

                <MetaPill>{job._count.applications} applicants</MetaPill>
              </div>
            </div>

            {/* Description card */}
            <div
              style={{
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: 18,
                padding: "24px",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--ink)",
                  margin: "0 0 16px",
                }}
              >
                Job Description
              </h2>
              <div
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  color: "var(--ink-soft)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {job.description}
              </div>
            </div>

            {/* Required skills */}
            {requiredSkills.length > 0 && (
              <div
                style={{
                  background: "var(--white)",
                  border: "1.5px solid var(--line)",
                  borderRadius: 18,
                  padding: "24px",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "var(--ink)",
                    margin: "0 0 14px",
                  }}
                >
                  Required Skills
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 99,
                        background: "var(--paper-2)",
                        border: "1px solid var(--line)",
                        fontFamily: "var(--body)",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--ink-soft)",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 24 }}>
            {/* Apply CTA card */}
            <div
              style={{
                background: "var(--clay)",
                borderRadius: 18,
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 800,
                    fontSize: 20,
                    color: "#FBFAF5",
                    margin: "0 0 4px",
                  }}
                >
                  Ready to apply?
                </p>
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "rgba(251,250,245,.7)", margin: 0 }}>
                  {job.company.verifiedEmployer ? "Verified employer · " : ""}
                  {hasSalary ? salaryLabel : "Salary not disclosed"}
                </p>
              </div>

              {job.status !== "ACTIVE" && (
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(251,250,245,.15)",
                    color: "#FBFAF5",
                    fontFamily: "var(--body)",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: 99,
                  }}
                >
                  {job.status}
                </span>
              )}

              {isJobSeeker && job.status === "ACTIVE" && (
                <ApplyButton jobId={jobId} />
              )}
              {!userId && (
                <Link
                  href="/login"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "11px 24px",
                    background: "#FBFAF5",
                    color: "var(--clay)",
                    borderRadius: 10,
                    fontFamily: "var(--body)",
                    fontWeight: 700,
                    fontSize: 15,
                    textDecoration: "none",
                  }}
                >
                  Sign in to Apply
                </Link>
              )}
            </div>

            {/* Company card */}
            <div
              style={{
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: 18,
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <CompanyLogoLg name={job.company.name} size={42} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontFamily: "var(--body)", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                      {job.company.name}
                    </span>
                    {job.company.verifiedEmployer && <VerifiedBadge size="sm" />}
                  </div>
                  {job.company.industry && (
                    <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                      {job.company.industry}
                    </p>
                  )}
                </div>
              </div>

              {job.company.size && (
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-soft)", marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>Size:</span> {job.company.size} employees
                </p>
              )}

              {job.company.websiteUrl && (
                <a
                  href={job.company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "var(--body)",
                    fontSize: 12,
                    color: "var(--blue)",
                    display: "block",
                    marginBottom: 14,
                    wordBreak: "break-all",
                  }}
                >
                  {job.company.websiteUrl}
                </a>
              )}

              <Link
                href={`/companies/${job.companyId}`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "8px 0",
                  border: "1.5px solid var(--line)",
                  borderRadius: 8,
                  fontFamily: "var(--body)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  textDecoration: "none",
                }}
              >
                View company →
              </Link>
            </div>

            {/* Similar jobs */}
            {similarJobs.length > 0 && (
              <div
                style={{
                  background: "var(--white)",
                  border: "1.5px solid var(--line)",
                  borderRadius: 18,
                  padding: "20px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--ink)",
                    margin: "0 0 12px",
                  }}
                >
                  More from {job.company.name}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {similarJobs.map((sj, i) => (
                    <Link
                      key={sj.id}
                      href={`/jobs/${sj.id}`}
                      style={{
                        display: "block",
                        padding: "10px 0",
                        borderBottom: i < similarJobs.length - 1 ? "1px solid var(--line)" : "none",
                        textDecoration: "none",
                      }}
                    >
                      <p style={{ fontFamily: "var(--body)", fontWeight: 600, fontSize: 13, color: "var(--ink)", margin: "0 0 2px" }}>
                        {sj.title}
                      </p>
                      <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                        {sj.region.city || sj.region.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
