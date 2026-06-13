import Link from "next/link";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import JobFavouriteButton from "@/components/shared/jobs/JobFavouriteButton";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    remoteType: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency: string;
    createdAt: string | Date;
    company: {
      id: string;
      name: string;
      industry?: string | null;
      verifiedEmployer: boolean;
    };
    region: { name: string; city: string };
    _count?: { applications: number } | null;
  };
  matchScore?: number | null;
  skills?: string[];
  applied?: boolean;
  favourited?: boolean;
  isAuthenticated?: boolean;
}

function daysAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
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

function CompanyLogo({ name }: { name: string }) {
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
        width: 38,
        height: 38,
        borderRadius: 10,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "#FBFAF5",
        fontFamily: "var(--body)",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

const REMOTE_LABELS: Record<string, string> = {
  ONSITE: "Onsite",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

const REMOTE_CHIP_STYLE: Record<string, React.CSSProperties> = {
  ONSITE: { background: "rgba(160,78,55,.10)", color: "var(--clay)" },
  HYBRID: { background: "rgba(50,122,214,.10)", color: "var(--blue)" },
  REMOTE: { background: "rgba(14,158,110,.10)", color: "var(--green)" },
};

export default function JobCard({ job, matchScore, skills, applied, favourited, isAuthenticated }: JobCardProps) {
  const hasSalary = job.salaryMin != null || job.salaryMax != null;

  const salaryLabel = hasSalary
    ? `₨ ${((job.salaryMin ?? 0) / 100000).toFixed(0)} – ${((job.salaryMax ?? 0) / 100000).toFixed(0)} L /month`
    : null;

  const remoteStyle = REMOTE_CHIP_STYLE[job.remoteType] ?? {
    background: "var(--paper-2)",
    color: "var(--ink-soft)",
  };
  const remoteLabel = REMOTE_LABELS[job.remoteType] ?? job.remoteType;

  return (
    <Link href={`/jobs/${job.id}`} className="group block">
      <div
        style={{
          background: "var(--white)",
          border: "1.5px solid var(--line)",
          borderRadius: 18,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
        className="card-hover"
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <CompanyLogo name={job.company.name} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontFamily: "var(--body)",
                    fontWeight: 600,
                    fontSize: 13,
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {job.company.name}
                </span>
                {job.company.verifiedEmployer && (
                  <VerifiedBadge size="sm" />
                )}
              </div>
            </div>
          </div>

          {/* Remote chip + optional favourite */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span
              style={{
                ...remoteStyle,
                fontFamily: "var(--body)",
                fontWeight: 600,
                fontSize: 11,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                padding: "3px 9px",
                borderRadius: 99,
                whiteSpace: "nowrap",
              }}
            >
              {remoteLabel}
            </span>
            {favourited !== undefined && (
              <JobFavouriteButton
                jobId={job.id}
                initialFavourited={favourited}
                isAuthenticated={isAuthenticated ?? false}
                size="sm"
              />
            )}
          </div>
        </div>

        {/* Region */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)" }}>
            {job.region.city || job.region.name}
          </span>
        </div>

        {/* Job title */}
        <div>
          <h3
            style={{
              fontFamily: "var(--display)",
              fontWeight: 500,
              fontSize: 18,
              color: "var(--ink)",
              lineHeight: 1.25,
              margin: 0,
            }}
            className="group-hover:[color:var(--blue)] transition-colors line-clamp-2"
          >
            {job.title}
          </h3>
        </div>

        {/* Salary */}
        {salaryLabel && (
          <div
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 15,
              color: "var(--clay)",
            }}
          >
            {salaryLabel}
          </div>
        )}

        {/* Skills chips */}
        {skills && skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {skills.slice(0, 5).map((s) => (
              <span
                key={s}
                style={{
                  background: "var(--paper-2)",
                  color: "var(--ink-soft)",
                  fontFamily: "var(--body)",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 9px",
                  borderRadius: 99,
                  border: "1px solid var(--line)",
                }}
              >
                {s}
              </span>
            ))}
            {skills.length > 5 && (
              <span
                style={{
                  background: "var(--paper-2)",
                  color: "var(--ink-faint)",
                  fontFamily: "var(--body)",
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 99,
                  border: "1px solid var(--line)",
                }}
              >
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Match bar */}
        {matchScore != null && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div
              style={{
                height: 4,
                borderRadius: 99,
                background: "var(--paper-3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (matchScore / 12) * 100)}%`,
                  background: "var(--blue)",
                  borderRadius: 99,
                  transition: "width .4s ease",
                }}
              />
            </div>
            <span style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink-faint)" }}>
              {matchScore}/12 skills matched
            </span>
          </div>
        )}

        {/* Bottom row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTop: "1px solid var(--line)",
          }}
        >
          <span style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--ink-faint)" }}>
            {daysAgo(job.createdAt)}{job._count != null ? ` · ${job._count.applications} applicant${job._count.applications !== 1 ? "s" : ""}` : ""}
          </span>

          {applied ? (
            <span
              style={{
                background: "rgba(14,158,110,.12)",
                color: "var(--green)",
                fontFamily: "var(--body)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 99,
              }}
            >
              Applied
            </span>
          ) : (
            <span
              style={{
                background: "var(--clay)",
                color: "#FBFAF5",
                fontFamily: "var(--body)",
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 14px",
                borderRadius: 99,
              }}
              className="group-hover:opacity-90 transition-opacity"
            >
              Apply
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
