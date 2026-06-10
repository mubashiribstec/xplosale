import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ adminId?: string; targetType?: string; from?: string; to?: string; page?: string }>;
}

const TARGET_TYPES = ["user", "listing", "verification", "job", "company"];

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const {
    adminId = "",
    targetType = "",
    from = "",
    to = "",
    page: pageStr = "1",
  } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const limit = 50;

  const where: { adminId?: string; targetType?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
  if (adminId) where.adminId = adminId;
  if (targetType) where.targetType = targetType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
  }

  const [total, logs, admins] = await Promise.all([
    prisma.adminActionLog.count({ where }),
    prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { admin: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      ...(adminId ? { adminId } : {}),
      ...(targetType ? { targetType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      page: "1",
      ...overrides,
    });
    return `?${params.toString()}`;
  }

  const exportHref = `/api/admin/audit/export?${new URLSearchParams({
    ...(adminId ? { adminId } : {}),
    ...(targetType ? { targetType } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }).toString()}`;

  const hasFilters = !!(adminId || targetType || from || to);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <a
          href={exportHref}
          className="px-3 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
        >
          Export CSV
        </a>
      </div>

      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Admin</label>
          <select
            name="adminId"
            defaultValue={adminId}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All admins</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            name="targetType"
            defaultValue={targetType}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All types</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Filter
        </button>

        {hasFilters && (
          <Link
            href="/admin/audit"
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </Link>
        )}

        <span className="text-sm text-gray-500 ml-auto self-center">{total} entries</span>
      </form>

      <div className="flex flex-wrap gap-2">
        {TARGET_TYPES.map((t) => (
          <Link
            key={t}
            href={buildHref({ targetType: t })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              targetType === t
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t}
          </Link>
        ))}
        {targetType && (
          <Link
            href={buildHref({ targetType: "" })}
            className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            All types
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Admin</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Target ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No audit entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                    {new Date(log.createdAt).toLocaleString("en-PK", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{log.admin.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{log.action}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      {log.targetType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {log.targetId.slice(0, 12)}&hellip;
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {log.reason ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildHref({ page: String(p) })}
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
    </div>
  );
}
