import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import PipelineSettings from "@/components/shared/ats/PipelineSettings";

export default async function PipelineSettingsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { pipelineStages: { orderBy: { order: "asc" } } },
  });
  if (!company) notFound();

  const userRole = (session.user as { role: string }).role;
  const isOwner = company.ownerId === userId;
  const isAdmin = userRole === "ADMIN";

  if (!isOwner && !isAdmin) redirect("/");

  // Ensure stages are seeded for existing companies
  if (company.pipelineStages.length === 0) {
    const { seedDefaultStages } = await import("@/verticals/jobs/ats/seed-stages");
    await seedDefaultStages(companyId, prisma);
    const seeded = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: "asc" },
    });
    company.pipelineStages.push(...seeded);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link
            href="/me/employer/jobs"
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--ink-faint)" }}
          >
            ← Back to jobs
          </Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--ink)" }}>Pipeline Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--ink-faint)" }}>{company.name}</p>
        </div>

        <PipelineSettings
          companyId={companyId}
          initialStages={company.pipelineStages.map((s) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            color: s.color,
            isInitial: s.isInitial,
            isHired: s.isHired,
            isRejected: s.isRejected,
          }))}
        />
      </div>
    </main>
  );
}
