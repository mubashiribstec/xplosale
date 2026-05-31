import Link from "next/link";
import JobCard from "@/components/shared/JobCard";
import JobFilters from "@/components/shared/JobFilters";
import { prisma } from "@/lib/prisma";

interface SearchParams {
  regionSlug?: string;
  remoteType?: string;
  minSalary?: string;
  maxSalary?: string;
  keyword?: string;
  page?: string;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 20;

  const where: Record<string, unknown> = { status: "ACTIVE" };

  if (sp.regionSlug) where.region = { slug: sp.regionSlug };
  if (sp.remoteType) where.remoteType = sp.remoteType;
  if (sp.keyword) where.title = { contains: sp.keyword, mode: "insensitive" };
  if (sp.minSalary || sp.maxSalary) {
    const salaryFilter: Record<string, number> = {};
    if (sp.minSalary) salaryFilter.gte = parseInt(sp.minSalary, 10);
    if (sp.maxSalary) salaryFilter.lte = parseInt(sp.maxSalary, 10);
    where.salaryMin = salaryFilter;
  }

  const [regions, jobs, total] = await Promise.all([
    prisma.region.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.jobPosting.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, industry: true, verifiedEmployer: true, logoUrl: true } },
        region: { select: { id: true, name: true, slug: true, city: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.jobPosting.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  const spRecord: Record<string, string> = {};
  if (sp.regionSlug) spRecord.regionSlug = sp.regionSlug;
  if (sp.remoteType) spRecord.remoteType = sp.remoteType;
  if (sp.minSalary) spRecord.minSalary = sp.minSalary;
  if (sp.maxSalary) spRecord.maxSalary = sp.maxSalary;
  if (sp.keyword) spRecord.keyword = sp.keyword;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 mt-1">{total} position{total !== 1 ? "s" : ""} found</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside>
            <JobFilters regions={regions} searchParams={spRecord} />
          </aside>

          <section className="lg:col-span-3 space-y-4">
            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
                <p>No jobs found matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                {page > 1 && (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...spRecord, page: String(page - 1) }).toString()}`}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </Link>
                )}
                <span className="text-sm text-gray-500">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link
                    href={`/jobs?${new URLSearchParams({ ...spRecord, page: String(page + 1) }).toString()}`}
                    className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
