import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ adminId?: string; targetType?: string; page?: string }>;
}

const TARGET_TYPES = ["user", "listing", "verification", "job", "company"];

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const {
    adminId = "",
    targetType = "",
    page: pageStr = "1",
  } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const limit = 50;

  const where: { adminId?: string; targetType?: string } = {};
  if (adminId) where.adminId = adminId;
  if (targetType) where.targetType = targetType;

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
      page: "1",
      ...overrides,
    });
    return `?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>

      <div className="flex flex-wrap gap-3 items-center">
        <select
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

        <select
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

        <div className="flex flex-wrap gap-2 text-sm">
          {admins.map((a) => (
            <Link
              key={a.id}
              href={buildHref({ adminId: a.id })}
              className={`px-2 py-1 rounded border text-xs transition-colors ${
                adminId === a.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {a.name}
            </Link>
          ))}
          {adminId && (
            <Link
              href={buildHref({ adminId: "" })}
              className="px-2 py-1 rounded border border-gray-300 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Clear
            </Link>
          )}
        </div>

        <span className="text-sm text-gray-500 ml-auto">{total} entries</span>
      </div>

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
