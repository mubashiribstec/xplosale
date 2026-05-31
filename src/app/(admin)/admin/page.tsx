import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/shared/StatCard";

export default async function AdminDashboardPage() {
  const [userCount, pendingVerifications, pendingListings, activeListings, totalJobs, recentActions] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verificationStatus: "PENDING" } }),
      prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.jobPosting.count({ where: { status: "ACTIVE" } }),
      prisma.adminActionLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { id: true, name: true } } },
      }),
    ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={userCount} color="gray" />
        <StatCard
          label="Pending Verifications"
          value={pendingVerifications}
          href="/admin/verifications"
          color="yellow"
        />
        <StatCard
          label="Pending Listings"
          value={pendingListings}
          href="/admin/listings"
          color="red"
        />
        <StatCard label="Active Listings" value={activeListings} color="green" />
        <StatCard label="Active Jobs" value={totalJobs} color="blue" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Actions</h2>
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
                    <td className="px-4 py-3 text-gray-800">{action.admin.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{action.action}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-gray-400">{action.targetType}/</span>
                      <span className="font-mono text-xs">{action.targetId.slice(0, 8)}&hellip;</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                      {action.reason ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(action.createdAt).toLocaleString("en-PK", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
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
