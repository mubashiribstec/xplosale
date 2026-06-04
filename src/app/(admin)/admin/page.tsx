import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/StatCard";

export const metadata = { title: "Admin — Xplosale" };

const SECTIONS = [
  {
    title: "User Verification",
    desc: "Review CNIC/passport submissions, allocate or revoke verified badge.",
    href: "/admin/verifications",
    accent: "#0e9e6e",
  },
  {
    title: "Partner Verification",
    desc: "Approve or reject partner applications; allocate partner badge.",
    href: "/admin/partners",
    accent: "#d97706",
  },
  {
    title: "User Management",
    desc: "Search users, change roles, ban/unban, force-logout.",
    href: "/admin/users",
    accent: "#6366f1",
  },
  {
    title: "Content Moderation",
    desc: "Review pending listings; approve, reject, or escalate.",
    href: "/admin/listings",
    accent: "#ef4444",
  },
  {
    title: "Companies",
    desc: "View and manage employer company profiles.",
    href: "/admin/companies",
    accent: "#3b82f6",
  },
  {
    title: "Escrow",
    desc: "Monitor and resolve escrow disputes.",
    href: "/admin/escrow",
    accent: "#8b5cf6",
  },
  {
    title: "Audit Log",
    desc: "Full searchable record of every admin action.",
    href: "/admin/audit",
    accent: "#6b7280",
  },
  {
    title: "Support",
    desc: "Open support DM rooms with users.",
    href: "/admin/support",
    accent: "#14b8a6",
  },
];

export default async function AdminDashboardPage() {
  const [userCount, pendingVerifications, pendingPartners, pendingListings, activeListings, totalJobs, bannedCount, recentActions] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.partnerApplication.count({ where: { status: "PENDING" } }),
      prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.jobPosting.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { bannedAt: { not: null } } }),
      prisma.adminActionLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { id: true, name: true } } },
      }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={userCount} color="gray" />
        <StatCard label="Pending Verifications" value={pendingVerifications} href="/admin/verifications" color="yellow" />
        <StatCard label="Pending Partners" value={pendingPartners} href="/admin/partners" color="yellow" />
        <StatCard label="Pending Listings" value={pendingListings} href="/admin/listings" color="red" />
        <StatCard label="Active Listings" value={activeListings} color="green" />
        <StatCard label="Active Jobs" value={totalJobs} color="blue" />
        <StatCard label="Banned Users" value={bannedCount} href="/admin/users?filter=banned" color="red" />
      </div>

      {/* Section cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECTIONS.map(({ title, desc, href, accent }) => (
            <Link
              key={href}
              href={href}
              className="group block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all text-decoration-none"
              style={{ textDecoration: "none" }}
            >
              <div
                className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center text-white text-sm font-bold"
                style={{ background: accent }}
              >
                {title[0]}
              </div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700 mb-1">{title}</p>
              <p className="text-xs text-gray-400 leading-snug">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent audit log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Actions</h2>
          <Link href="/admin/audit" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {recentActions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No admin actions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Admin</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentActions.map((action) => (
                  <tr key={action.id}>
                    <td className="px-4 py-3 text-gray-800">{action.admin.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{action.action}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-gray-400">{action.targetType}/</span>
                      <span className="font-mono text-xs">{action.targetId.slice(0, 8)}&hellip;</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{action.reason ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(action.createdAt).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
