import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 40;

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const { page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));

  const [total, logs] = await Promise.all([
    prisma.adminActionLog.count({ where: { targetType: "report" } }),
    prisma.adminActionLog.findMany({
      where: { targetType: "report" },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  // Platform-wide content counts for at-a-glance moderation health
  const [pendingListings, activeListings, pendingPartners, pendingVerifications] = await Promise.all([
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { verificationStatus: "PENDING" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Moderation</h1>
        <p className="text-sm text-gray-500 mt-1">Platform moderation health and content queue snapshot.</p>
      </div>

      {/* Moderation health */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Listings pending review", value: pendingListings, href: "/admin/listings", color: "text-orange-600" },
          { label: "Active listings", value: activeListings, href: "/admin/listings", color: "text-green-600" },
          { label: "Partner applications", value: pendingPartners, href: "/admin/partners", color: "text-blue-600" },
          { label: "ID verifications", value: pendingVerifications, href: "/admin/verifications", color: "text-purple-600" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Moderation quick links */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Moderation Queues</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/listings", label: "Listing Review" },
            { href: "/admin/verifications", label: "Identity Verifications" },
            { href: "/admin/partners", label: "Partner Applications" },
            { href: "/admin/escrow", label: "Disputed Escrow" },
            { href: "/admin/jobs", label: "Job Moderation" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      </section>

      {/* Report action log */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Report Action Log{" "}
          <span className="text-sm font-normal text-gray-400">({total})</span>
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">No report actions logged yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Admin</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{log.admin.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.targetId.slice(0, 12)}…</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{log.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center gap-2 justify-center mt-4">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`?page=${p}`}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
