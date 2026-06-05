import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [bannedUsers, recentBans, onlineUsers, recentActions] = await Promise.all([
    prisma.user.count({ where: { bannedAt: { not: null } } }),
    prisma.user.findMany({
      where: { bannedAt: { gte: oneDayAgo } },
      select: { id: true, name: true, email: true, phone: true, bannedAt: true, banReason: true },
      orderBy: { bannedAt: "desc" },
      take: 20,
    }),
    prisma.user.count({ where: { lastSeenAt: { gte: fiveMinAgo } } }),
    prisma.adminActionLog.findMany({
      where: {
        action: { in: ["BAN_USER", "UNBAN_USER", "FORCE_LOGOUT", "CHANGE_ROLE"] },
        createdAt: { gte: oneDayAgo },
      },
      include: { admin: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Centre</h1>
        <p className="text-sm text-gray-500 mt-1">Bans, forced logouts, and online activity.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Banned accounts", value: bannedUsers, color: "text-red-600" },
          { label: "Bans (24 h)", value: recentBans.length, color: "text-orange-600" },
          { label: "Online now (5 min)", value: onlineUsers, color: "text-green-600" },
          { label: "Security actions (24 h)", value: recentActions.length, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent bans */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Bans (24 h)</h2>
        {recentBans.length === 0 ? (
          <p className="text-sm text-gray-400">No bans in the last 24 hours.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Banned at</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentBans.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{u.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{u.email ?? u.phone ?? u.id.slice(0, 12)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {u.bannedAt
                        ? new Date(u.bannedAt).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{u.banReason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users?search=${encodeURIComponent(u.email ?? u.id)}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent security actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Security Actions (24 h)</h2>
        {recentActions.length === 0 ? (
          <p className="text-sm text-gray-400">No security actions in the last 24 hours.</p>
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
                {recentActions.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString("en-PK", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{log.admin.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          log.action.startsWith("BAN") ? "bg-red-100 text-red-700"
                          : log.action === "FORCE_LOGOUT" ? "bg-orange-100 text-orange-700"
                          : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.targetId.slice(0, 12)}…</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{log.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
