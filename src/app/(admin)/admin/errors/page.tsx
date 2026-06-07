import { prisma } from "@/lib/prisma";
import AdminErrorsTable from "@/components/shared/AdminErrorsTable";

export const metadata = { title: "Error Log — Admin" };

interface PageProps {
  searchParams: Promise<{
    level?: string;
    source?: string;
    status?: string;
    route?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 40;

export default async function AdminErrorsPage({ searchParams }: PageProps) {
  const {
    level = "",
    source = "",
    status = "OPEN",
    route: routeFilter = "",
    page: pageStr = "1",
  } = await searchParams;

  const page = Math.max(1, parseInt(pageStr, 10));

  const where = {
    ...(level  ? { level:  level  as "ERROR" | "WARN" | "DEAD_CLICK" } : {}),
    ...(source ? { source: source as "CLIENT" | "SERVER" }             : {}),
    ...(status ? { status: status as "OPEN" | "RESOLVED" | "IGNORED" } : {}),
    ...(routeFilter
      ? { route: { contains: routeFilter, mode: "insensitive" as const } }
      : {}),
  };

  const [total, errors, counts] = await Promise.all([
    prisma.errorLog.count({ where }),
    prisma.errorLog.findMany({
      where,
      orderBy: { count: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // Sidebar counts (status = OPEN only, ungrouped)
    prisma.errorLog.groupBy({
      by: ["level"],
      where: { status: "OPEN" },
      _count: { _all: true },
      _sum:   { count: true },
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const openByLevel = Object.fromEntries(
    counts.map((c) => [c.level, { unique: c._count._all, total: c._sum.count ?? 0 }])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Grouped by fingerprint · auto-reopens on recurrence
          </p>
        </div>
        <a
          href="/api/admin/errors/export?format=md"
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Export .md
        </a>
      </div>

      {/* Open-error summary pills */}
      <div className="flex gap-3 flex-wrap">
        {(["ERROR", "WARN", "DEAD_CLICK"] as const).map((lvl) => {
          const d = openByLevel[lvl];
          if (!d) return null;
          const colors: Record<string, string> = {
            ERROR: "bg-red-50 border-red-200 text-red-700",
            WARN:  "bg-yellow-50 border-yellow-200 text-yellow-700",
            DEAD_CLICK: "bg-gray-50 border-gray-200 text-gray-600",
          };
          return (
            <div key={lvl} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[lvl]}`}>
              {d.unique} unique {lvl} · {d.total} occurrences
            </div>
          );
        })}
      </div>

      <AdminErrorsTable
        errors={errors.map((e) => ({
          ...e,
          firstSeenAt: e.firstSeenAt.toISOString(),
          lastSeenAt:  e.lastSeenAt.toISOString(),
          createdAt:   e.createdAt.toISOString(),
          breadcrumbs: e.breadcrumbs ?? null,
        }))}
        total={total}
        page={page}
        pages={pages}
      />
    </div>
  );
}
