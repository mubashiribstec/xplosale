import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import JobCard from "@/components/shared/JobCard";
import { prisma } from "@/lib/prisma";
import { searchClient } from "@/core/search/postgres";
import { encodeCursor } from "@/core/search/query";
import type { JobHit } from "@/core/search/postgres";
import SaveSearchButton from "@/components/shared/SaveSearchButton";
import { getSession } from "@/core/auth/session";

export const metadata: Metadata = {
  title: "Jobs — Xplosale",
  description:
    "Find jobs at verified Pakistani companies. Apply with a verified identity — know exactly who you are applying to.",
  openGraph: {
    title: "Jobs — Xplosale",
    description: "Verified jobs at Pakistani companies. Apply with confidence.",
    type: "website",
  },
  alternates: { canonical: "/jobs" },
};

interface SearchParams {
  regionSlug?: string;
  remoteType?: string;
  employmentType?: string;
  experienceLevel?: string;
  minSalary?: string;
  maxSalary?: string;
  keyword?: string;
  sort?: string;
  page?: string;
  verified?: string;
}

const REMOTE_TYPES = ["All", "Onsite", "Hybrid", "Remote"] as const;
const EMPLOYMENT_TYPES = ["All", "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"] as const;
const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  All: "All",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  FREELANCE: "Freelance",
};
const EXPERIENCE_LEVELS = ["All", "ENTRY", "MID", "SENIOR", "LEAD"] as const;
const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  All: "All",
  ENTRY: "Entry",
  MID: "Mid",
  SENIOR: "Senior",
  LEAD: "Lead",
};
const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "relevance", label: "Relevance" },
  { key: "salary_asc", label: "Salary ↑" },
  { key: "salary_desc", label: "Salary ↓" },
];

async function resolveRegionId(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined;
  const r = await prisma.region.findUnique({ where: { slug }, select: { id: true } });
  return r?.id;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [sp, session] = await Promise.all([searchParams, getSession()]);
  const sessionUser = session?.user as { role?: string; id?: string } | undefined;
  const canPostJobs = sessionUser?.role === "PARTNER" || sessionUser?.role === "ADMIN";
  const isAuthenticated = !!sessionUser;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 20;

  const regionId = await resolveRegionId(sp.regionSlug);

  const filters: Record<string, unknown> = {};
  if (regionId) filters.regionId = regionId;
  if (sp.remoteType && sp.remoteType !== "All") filters.remoteType = sp.remoteType.toUpperCase();
  if (sp.employmentType && sp.employmentType !== "All") filters.employmentType = sp.employmentType;
  if (sp.experienceLevel && sp.experienceLevel !== "All") filters.experienceLevel = sp.experienceLevel;
  if (sp.minSalary) filters.salaryMin = parseInt(sp.minSalary, 10);
  if (sp.maxSalary) filters.salaryMax = parseInt(sp.maxSalary, 10);
  if (sp.verified === "true") filters.verified = true;

  const VALID_SORTS = ["relevance", "newest", "salary_asc", "salary_desc"] as const;
  type JobSort = typeof VALID_SORTS[number];
  const sort: JobSort = (VALID_SORTS as readonly string[]).includes(sp.sort ?? "") ? (sp.sort as JobSort) : "newest";
  const cursor = page > 1 ? encodeCursor((page - 1) * limit) : undefined;

  // Fetch search results
  const result = await searchClient.search<JobHit>({
    vertical: "jobs",
    query: sp.keyword ?? "",
    filters,
    sort,
    cursor,
    limit,
  });

  // Keep a separate count query for pagination total
  const countWhere: Record<string, unknown> = { status: "ACTIVE" };
  if (regionId) countWhere.regionId = regionId;
  if (sp.remoteType && sp.remoteType !== "All") countWhere.remoteType = sp.remoteType.toUpperCase();
  if (sp.employmentType && sp.employmentType !== "All") countWhere.employmentType = sp.employmentType;
  if (sp.experienceLevel && sp.experienceLevel !== "All") countWhere.experienceLevel = sp.experienceLevel;
  if (sp.keyword) countWhere.title = { contains: sp.keyword, mode: "insensitive" };
  if (sp.verified === "true") countWhere.company = { verifiedEmployer: true };
  if (sp.minSalary || sp.maxSalary) {
    const salaryFilter: Record<string, number> = {};
    if (sp.minSalary) salaryFilter.gte = parseInt(sp.minSalary, 10);
    if (sp.maxSalary) salaryFilter.lte = parseInt(sp.maxSalary, 10);
    countWhere.salaryMin = salaryFilter;
  }

  const [regions, total] = await Promise.all([
    prisma.region.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.jobPosting.count({ where: countWhere as Prisma.JobPostingWhereInput }),
  ]);

  const pages = Math.ceil(total / limit);

  // Batch-load which of these jobs the current user has saved
  let favouritedIds = new Set<string>();
  if (sessionUser?.id) {
    const favRows = await prisma.jobFavourite.findMany({
      where: { userId: sessionUser.id, jobPostingId: { in: result.hits.map((h) => h.id) } },
      select: { jobPostingId: true },
    });
    favouritedIds = new Set(favRows.map((f) => f.jobPostingId));
  }

  // Map JobHit to the shape JobCard expects
  const jobs = result.hits.map((hit) => ({
    id: hit.id,
    title: hit.title,
    remoteType: hit.remoteType,
    salaryMin: hit.salaryMin ?? null,
    salaryMax: hit.salaryMax ?? null,
    currency: hit.currency,
    createdAt: hit.createdAt instanceof Date ? hit.createdAt.toISOString() : String(hit.createdAt),
    company: {
      id: hit.companyId,
      name: hit.companyName,
      verifiedEmployer: hit.verifiedEmployer,
    },
    region: { name: hit.regionName, city: hit.regionCity },
  }));

  const spRecord: Record<string, string> = {};
  if (sp.regionSlug) spRecord.regionSlug = sp.regionSlug;
  if (sp.remoteType) spRecord.remoteType = sp.remoteType;
  if (sp.employmentType) spRecord.employmentType = sp.employmentType;
  if (sp.experienceLevel) spRecord.experienceLevel = sp.experienceLevel;
  if (sp.minSalary) spRecord.minSalary = sp.minSalary;
  if (sp.maxSalary) spRecord.maxSalary = sp.maxSalary;
  if (sp.keyword) spRecord.keyword = sp.keyword;
  if (sp.sort) spRecord.sort = sp.sort;
  if (sp.verified) spRecord.verified = sp.verified;

  const activeRemote = sp.remoteType ?? "All";
  const activeSort = sp.sort ?? "newest";

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)" }}>
      {/* Hero header */}
      <div
        style={{
          background: "var(--white)",
          borderBottom: "1px solid var(--line)",
          padding: "40px 0 28px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: "var(--clay)",
              marginBottom: 8,
            }}
          >
            Jobs · Verified employers
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: 36,
                  color: "var(--ink)",
                  lineHeight: 1.1,
                  margin: 0,
                }}
              >
                Hire. Get hired. Verified.
              </h1>
              <p style={{ fontFamily: "var(--body)", fontSize: 15, color: "var(--ink-soft)", marginTop: 8 }}>
                {total.toLocaleString()} position{total !== 1 ? "s" : ""} from verified employers
              </p>
            </div>
            {canPostJobs && (
              <Link
                href="/me/employer/jobs/new"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "10px 20px",
                  background: "var(--clay)",
                  color: "var(--white)",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--body)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Post a Job
              </Link>
            )}
          </div>

          {/* Search + filter bar */}
          <form
            method="GET"
            action="/jobs"
            style={{
              marginTop: 20,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 180 }}>
              <svg
                style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                name="keyword"
                defaultValue={sp.keyword ?? ""}
                placeholder="Search job title..."
                style={{
                  width: "100%",
                  paddingInlineStart: 38,
                  paddingRight: 14,
                  paddingTop: 10,
                  paddingBottom: 10,
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  fontFamily: "var(--body)",
                  fontSize: 14,
                  color: "var(--ink)",
                  background: "var(--paper)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <select
              name="regionSlug"
              defaultValue={sp.regionSlug ?? ""}
              style={{
                padding: "10px 14px",
                border: "1.5px solid var(--line)",
                borderRadius: 10,
                fontFamily: "var(--body)",
                fontSize: 14,
                color: sp.regionSlug ? "var(--ink)" : "var(--ink-faint)",
                background: "var(--paper)",
                outline: "none",
                flex: "0 0 auto",
              }}
            >
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.slug}>{r.name}</option>
              ))}
            </select>
            {/* Remote type chips in search bar */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["All", "ONSITE", "HYBRID", "REMOTE"] as const).map((rt) => {
                const labels: Record<string, string> = { All: "All", ONSITE: "Onsite", HYBRID: "Hybrid", REMOTE: "Remote" };
                const isActive = (sp.remoteType ?? "All").toUpperCase() === rt;
                return (
                  <Link
                    key={rt}
                    href={`/jobs?${new URLSearchParams({ ...spRecord, remoteType: rt === "All" ? "" : rt, page: "1" }).toString()}`}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 99,
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      border: `1.5px solid ${isActive ? "var(--clay)" : "var(--line)"}`,
                      background: isActive ? "var(--clay)" : "var(--white)",
                      color: isActive ? "var(--white)" : "var(--ink-soft)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {labels[rt]}
                  </Link>
                );
              })}
            </div>
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: "var(--clay)",
                color: "var(--white)",
                border: "none",
                borderRadius: 10,
                fontFamily: "var(--body)",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Search
            </button>
            <SaveSearchButton
              vertical="jobs"
              queryJson={{
                keyword: sp.keyword,
                regionSlug: sp.regionSlug,
                remoteType: sp.remoteType,
                employmentType: sp.employmentType,
                experienceLevel: sp.experienceLevel,
                minSalary: sp.minSalary,
                maxSalary: sp.maxSalary,
                sort: sp.sort,
              }}
              defaultName={sp.keyword ? sp.keyword : "Job search"}
            />
          </form>

          {/* Employment type chips */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {EMPLOYMENT_TYPES.map((type) => {
              const isActive = (sp.employmentType ?? "All") === type;
              const href = `/jobs?${new URLSearchParams({ ...spRecord, employmentType: type === "All" ? "" : type, page: "1" }).toString()}`;
              return (
                <Link
                  key={type}
                  href={href}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 99,
                    fontFamily: "var(--body)",
                    fontSize: 12,
                    fontWeight: isActive ? 600 : 500,
                    border: `1px solid ${isActive ? "var(--clay)" : "var(--line)"}`,
                    background: isActive ? "var(--clay)" : "var(--paper-2)",
                    color: isActive ? "var(--white)" : "var(--ink-soft)",
                    textDecoration: "none",
                  }}
                >
                  {EMPLOYMENT_TYPE_LABELS[type]}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main layout: sidebar + feed */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "256px 1fr", gap: 24, alignItems: "start" }}>
          {/* Sidebar */}
          <aside style={{ position: "sticky", top: "calc(62px + 24px)" }}>
            <div
              style={{
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: 18,
                padding: "20px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <p style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 13, color: "var(--ink)", margin: 0 }}>
                Filters
              </p>

              {/* Salary range */}
              <div>
                <p style={{ fontFamily: "var(--body)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Salary Range (PKR)
                </p>
                <form method="GET" action="/jobs" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(spRecord).filter(([k]) => k !== "minSalary" && k !== "maxSalary").map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                  ))}
                  <input
                    type="number"
                    name="minSalary"
                    defaultValue={sp.minSalary ?? ""}
                    placeholder="Min salary"
                    style={{
                      padding: "8px 10px",
                      border: "1.5px solid var(--line)",
                      borderRadius: 8,
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      color: "var(--ink)",
                      background: "var(--paper)",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="number"
                    name="maxSalary"
                    defaultValue={sp.maxSalary ?? ""}
                    placeholder="Max salary"
                    style={{
                      padding: "8px 10px",
                      border: "1.5px solid var(--line)",
                      borderRadius: 8,
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      color: "var(--ink)",
                      background: "var(--paper)",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "7px 0",
                      background: "var(--paper-3)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      fontFamily: "var(--body)",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--ink-soft)",
                      cursor: "pointer",
                    }}
                  >
                    Apply
                  </button>
                </form>
              </div>

              {/* Remote type */}
              <div>
                <p style={{ fontFamily: "var(--body)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Work Type
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {REMOTE_TYPES.map((rt) => {
                    const val = rt === "All" ? "" : rt.toUpperCase();
                    const isActive = (sp.remoteType ?? "") === val;
                    return (
                      <Link
                        key={rt}
                        href={`/jobs?${new URLSearchParams({ ...spRecord, remoteType: val, page: "1" }).toString()}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: isActive ? "rgba(160,78,55,.08)" : "transparent",
                          border: `1px solid ${isActive ? "rgba(160,78,55,.3)" : "transparent"}`,
                          fontFamily: "var(--body)",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--clay)" : "var(--ink-soft)",
                          textDecoration: "none",
                        }}
                      >
                        {rt}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Employment type */}
              <div>
                <p style={{ fontFamily: "var(--body)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Employment Type
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {EMPLOYMENT_TYPES.map((type) => {
                    const isActive = (sp.employmentType ?? "All") === type;
                    return (
                      <Link
                        key={type}
                        href={`/jobs?${new URLSearchParams({ ...spRecord, employmentType: type === "All" ? "" : type, page: "1" }).toString()}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: isActive ? "rgba(160,78,55,.08)" : "transparent",
                          border: `1px solid ${isActive ? "rgba(160,78,55,.3)" : "transparent"}`,
                          fontFamily: "var(--body)",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--clay)" : "var(--ink-soft)",
                          textDecoration: "none",
                        }}
                      >
                        {EMPLOYMENT_TYPE_LABELS[type]}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Experience level */}
              <div>
                <p style={{ fontFamily: "var(--body)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Experience Level
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {EXPERIENCE_LEVELS.map((lvl) => {
                    const isActive = (sp.experienceLevel ?? "All") === lvl;
                    return (
                      <Link
                        key={lvl}
                        href={`/jobs?${new URLSearchParams({ ...spRecord, experienceLevel: lvl === "All" ? "" : lvl, page: "1" }).toString()}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: isActive ? "rgba(160,78,55,.08)" : "transparent",
                          border: `1px solid ${isActive ? "rgba(160,78,55,.3)" : "transparent"}`,
                          fontFamily: "var(--body)",
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? "var(--clay)" : "var(--ink-soft)",
                          textDecoration: "none",
                        }}
                      >
                        {EXPERIENCE_LEVEL_LABELS[lvl]}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Verified employers only */}
              <div>
                <p style={{ fontFamily: "var(--body)", fontSize: 11, fontWeight: 600, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
                  Employer
                </p>
                <Link
                  href={`/jobs?${new URLSearchParams({ ...spRecord, verified: sp.verified === "true" ? "" : "true", page: "1" }).toString()}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: sp.verified === "true" ? "rgba(14,158,110,.08)" : "transparent",
                    border: `1px solid ${sp.verified === "true" ? "rgba(14,158,110,.3)" : "transparent"}`,
                    fontFamily: "var(--body)",
                    fontSize: 13,
                    fontWeight: sp.verified === "true" ? 600 : 400,
                    color: sp.verified === "true" ? "var(--green-deep)" : "var(--ink-soft)",
                    textDecoration: "none",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 1L14 3.5V9C14 12.3 11.4 15.3 8 17C4.6 15.3 2 12.3 2 9V3.5L8 1Z" strokeLinejoin="round" />
                    <path d="M5.5 9L7 10.5L10.5 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Verified only
                </Link>
              </div>

              {/* Reset */}
              <Link
                href="/jobs"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "7px 0",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  fontFamily: "var(--body)",
                  fontSize: 12,
                  color: "var(--ink-faint)",
                  textDecoration: "none",
                }}
              >
                Reset filters
              </Link>
            </div>
          </aside>

          {/* Main feed */}
          <section>
            {/* Sort chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-faint)", marginRight: 4 }}>
                Sort:
              </span>
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.key}
                  href={`/jobs?${new URLSearchParams({ ...spRecord, sort: opt.key, page: "1" }).toString()}`}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 99,
                    fontFamily: "var(--body)",
                    fontSize: 12,
                    fontWeight: activeSort === opt.key ? 600 : 500,
                    border: `1.5px solid ${activeSort === opt.key ? "var(--ink)" : "var(--line)"}`,
                    background: activeSort === opt.key ? "var(--ink)" : "var(--white)",
                    color: activeSort === opt.key ? "var(--white)" : "var(--ink-soft)",
                    textDecoration: "none",
                  }}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            {jobs.length === 0 ? (
              <div
                style={{
                  background: "var(--white)",
                  border: "1.5px solid var(--line)",
                  borderRadius: 18,
                  padding: "60px 24px",
                  textAlign: "center",
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--paper-3)" strokeWidth="1.5" style={{ margin: "0 auto 16px" }}>
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
                <p style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 18, color: "var(--ink)", marginBottom: 8 }}>
                  No jobs found
                </p>
                <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink-faint)" }}>
                  Try adjusting your filters or{" "}
                  <Link href="/jobs" style={{ color: "var(--clay)", textDecoration: "none", fontWeight: 600 }}>
                    clear all
                  </Link>
                </p>
              </div>
            ) : (
              <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    favourited={favouritedIds.has(job.id)}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 24 }}>
                {page > 1 && (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...spRecord, page: String(page - 1) }).toString()}`}
                    style={{
                      padding: "8px 16px",
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      fontWeight: 500,
                      background: "var(--white)",
                      border: "1.5px solid var(--line)",
                      borderRadius: 8,
                      color: "var(--ink-soft)",
                      textDecoration: "none",
                    }}
                  >
                    Previous
                  </Link>
                )}
                <span style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-faint)" }}>
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...spRecord, page: String(page + 1) }).toString()}`}
                    style={{
                      padding: "8px 16px",
                      fontFamily: "var(--body)",
                      fontSize: 13,
                      fontWeight: 500,
                      background: "var(--white)",
                      border: "1.5px solid var(--line)",
                      borderRadius: 8,
                      color: "var(--ink-soft)",
                      textDecoration: "none",
                    }}
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
