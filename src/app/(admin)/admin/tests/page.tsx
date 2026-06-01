import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminTestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session || (session.user as { role: string }).role !== "ADMIN") redirect("/login");

  const { search = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const PAGE_SIZE = 20;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { company: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [total, templates] = await Promise.all([
    prisma.testTemplate.count({ where }),
    prisma.testTemplate.findMany({
      where,
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { questions: true, assignments: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Assessment Tests</h1>
        <p className="text-sm text-gray-500">{total} templates platform-wide</p>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search by test name or company…"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Test</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qs</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {templates.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-400">{t.durationMin} min</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{t.company.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{t._count.questions}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{t._count.assignments}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      t.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.isPublished ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {t.isPublished && (
                    <form
                      action={`/api/admin/tests/${t.id}`}
                      method="POST"
                      onSubmit={(e) => {
                        e.preventDefault();
                        fetch(`/api/admin/tests/${t.id}`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "unpublish" }),
                        }).then(() => window.location.reload());
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-600 hover:underline"
                      >
                        Unpublish
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No tests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {pageNum > 1 && (
            <a
              href={`?search=${encodeURIComponent(search)}&page=${pageNum - 1}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Prev
            </a>
          )}
          <span className="px-3 py-1.5 text-sm text-gray-500">
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages && (
            <a
              href={`?search=${encodeURIComponent(search)}&page=${pageNum + 1}`}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
