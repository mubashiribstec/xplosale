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
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/employer/${companyId}/pipeline-settings`}
              className="text-sm hover:opacity-80 transition-opacity"
              style={{ color: "var(--ink-faint)" }}
            >
              ← Back to settings
            </Link>
            <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--ink)" }}>Assessment Tests</h1>
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>{company.name}</p>
          </div>
          <Link
            href={`/employer/${companyId}/tests/new`}
            className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            + New Test
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-xl border p-12 text-center" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <p className="mb-4" style={{ color: "var(--ink-faint)" }}>No assessment tests yet.</p>
            <Link
              href={`/employer/${companyId}/tests/new`}
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ background: "var(--clay)", color: "var(--white)" }}
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
                className="block rounded-xl border p-5 transition-colors hover:opacity-90"
                style={{ background: "var(--white)", borderColor: "var(--line)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{t.name}</p>
                    {t.description && (
                      <p className="text-sm mt-0.5 line-clamp-1" style={{ color: "var(--ink-faint)" }}>{t.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: "var(--ink-faint)" }}>{t._count.questions} questions</span>
                      <span className="text-xs" style={{ color: "var(--ink-faint)" }}>{t.durationMin} min</span>
                      <span className="text-xs" style={{ color: "var(--ink-faint)" }}>{t._count.assignments} assigned</span>
                      {t.passingScorePercent != null && (
                        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Pass: {t.passingScorePercent}%</span>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full shrink-0"
                    style={
                      t.isPublished
                        ? { background: "rgba(14,158,110,.12)", color: "var(--green)" }
                        : { background: "var(--paper-2)", color: "var(--ink-soft)" }
                    }
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
