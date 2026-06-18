import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";
import AdminJobActions from "@/components/shared/AdminJobActions";

export const metadata: Metadata = { title: "Jobs — Admin", robots: { index: false, follow: false } };

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

const PAGE_SIZE = 30;

const STATUS_TABS = [
  { key: "ACTIVE", label: "Active" },
  { key: "DRAFT", label: "Draft" },
  { key: "CLOSED", label: "Closed" },
  { key: "EXPIRED", label: "Expired" },
];

function pill(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:  { bg: "#dcfce7", color: "#16a34a" },
    DRAFT:   { bg: "#f3f4f6", color: "#6b7280" },
    CLOSED:  { bg: "#fee2e2", color: "#dc2626" },
    EXPIRED: { bg: "#fef3c7", color: "#d97706" },
  };
  const s = map[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{ padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

export default async function AdminJobsPage({ searchParams }: Props) {
  const { status = "ACTIVE", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));

  const where = { status: status as "ACTIVE" | "DRAFT" | "CLOSED" | "EXPIRED" };

  const [total, jobs] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        remoteType: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        createdAt: true,
        expiresAt: true,
        company: { select: { id: true, name: true } },
        postedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  function pageHref(p: number) {
    return `/admin/jobs?status=${status}&page=${p}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Jobs Moderation</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2">
        {STATUS_TABS.map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/jobs?status=${key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              status === key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Company</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Posted by</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Salary</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Apps</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Created</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No {status.toLowerCase()} job postings.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/jobs/${job.id}`} className="hover:underline" target="_blank">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <Link href={`/admin/companies/${job.company.id}`} className="hover:underline text-blue-600">
                      {job.company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <Link href={`/admin/users?search=${encodeURIComponent(job.postedBy.email ?? job.postedBy.name ?? "")}`} className="hover:underline">
                      {job.postedBy.name ?? job.postedBy.email ?? job.postedBy.id.slice(-6)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {job.salaryMin && job.salaryMax
                      ? `${(job.salaryMin / 1000).toFixed(0)}k–${(job.salaryMax / 1000).toFixed(0)}k ${job.currency}`
                      : job.salaryMin
                      ? `${(job.salaryMin / 1000).toFixed(0)}k+ ${job.currency}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{job._count.applications}</td>
                  <td className="px-4 py-3">{pill(job.status)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {job.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3 flex-wrap">
                      <Link
                        href={`/jobs/${job.id}`}
                        target="_blank"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                      <AdminJobActions jobId={job.id} jobTitle={job.title} status={job.status} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-3 justify-center">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-400">
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          {page < pages && (
            <Link href={pageHref(page + 1)} className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-400">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
