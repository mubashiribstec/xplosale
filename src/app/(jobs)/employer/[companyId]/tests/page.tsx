import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export default async function CompanyTestsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);
  const { companyId } = await params;
  const userRole = (session.user as { role: string }).role;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, ownerId: true },
  });
  if (!company) notFound();

  const isOwner = company.ownerId === userId;
  const isAdmin = userRole === "ADMIN";
  if (!isOwner && !isAdmin) redirect("/");

  const templates = await prisma.testTemplate.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true, assignments: true } },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/employer/${companyId}/pipeline-settings`} className="text-sm text-gray-400 hover:text-gray-600">
              ← Back to settings
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Assessment Tests</h1>
            <p className="text-sm text-gray-500">{company.name}</p>
          </div>
          <Link
            href={`/employer/${companyId}/tests/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Test
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">No assessment tests yet.</p>
            <Link
              href={`/employer/${companyId}/tests/new`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Create your first test
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/employer/${companyId}/tests/${t.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    {t.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{t._count.questions} questions</span>
                      <span className="text-xs text-gray-400">{t.durationMin} min</span>
                      <span className="text-xs text-gray-400">{t._count.assignments} assigned</span>
                      {t.passingScorePercent != null && (
                        <span className="text-xs text-gray-400">Pass: {t.passingScorePercent}%</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                      t.isPublished
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
