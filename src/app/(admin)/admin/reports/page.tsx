import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ReportActionsCell from "@/components/shared/ReportActionsCell";

export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  SPAM: "Spam",
  FRAUD: "Fraud / Scam",
  MISLEADING: "Misleading Info",
  INAPPROPRIATE: "Inappropriate Content",
  DUPLICATE: "Duplicate Listing",
  OTHER: "Other",
};

export default async function AdminReportsPage() {
  const [reports, unresolvedCount] = await Promise.all([
    prisma.listingReport.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        listing: { select: { id: true, title: true, status: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.listingReport.count({ where: { resolved: false } }),
  ]);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Listing Reports
          {unresolvedCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-sm font-bold bg-red-100 text-red-700 rounded-full">
              {unresolvedCount}
            </span>
          )}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Unresolved user-submitted listing reports.</p>
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

      {/* Unresolved listing reports table */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          No unresolved reports. All clear.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Listing</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Reporter</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <Link
                      href={`/m/${report.listing.id}`}
                      className="text-blue-600 hover:underline font-medium line-clamp-2 leading-snug"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {report.listing.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{report.listing.status.replace("_", " ")}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {REASON_LABEL[report.reason] ?? report.reason}
                    {report.details && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-[160px] line-clamp-2">{report.details}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="font-medium">{report.reporter.name ?? "—"}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{report.reporter.email ?? `ID: ${report.reporter.id.slice(0, 8)}`}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {new Date(report.createdAt).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <ReportActionsCell reportId={report.id} listingId={report.listing.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Moderation quick links */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Moderation Queues</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/listings", label: "Listing Review" },
            { href: "/admin/verifications", label: "Identity Verifications" },
            { href: "/admin/partners", label: "Partner Applications" },
            { href: "/admin/escrow", label: "Disputed Escrow" },
            { href: "/admin/shops/reports", label: "Shop Reports" },
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
    </div>
  );
}
