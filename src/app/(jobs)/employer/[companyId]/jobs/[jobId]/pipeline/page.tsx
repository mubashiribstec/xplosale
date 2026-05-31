import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import PipelineBoard from "@/components/shared/ats/PipelineBoard";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";
import { resolveStageForStatus } from "@/verticals/jobs/ats/backfill";
import { seedDefaultStages } from "@/verticals/jobs/ats/seed-stages";

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ companyId: string; jobId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { companyId, jobId } = await params;

  const userRole = (session.user as { role: string }).role;
  const allowed = await canAccessJobApplications(userId, jobId, userRole);
  if (!allowed) redirect("/");

  const [job, stages, applications] = await Promise.all([
    prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { id: true, title: true, companyId: true, company: { select: { ownerId: true } } },
    }),
    prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: "asc" },
    }),
    prisma.application.findMany({
      where: { jobPostingId: jobId },
      include: {
        jobSeeker: {
          select: {
            id: true,
            headline: true,
            user: { select: { id: true, name: true } },
          },
        },
        currentStage: {
          select: { id: true, name: true, color: true, isHired: true, isRejected: true, isInitial: true, order: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!job || job.companyId !== companyId) notFound();

  // Seed stages for existing companies that predate the ATS feature
  let resolvedStages = stages;
  if (stages.length === 0) {
    await seedDefaultStages(companyId, prisma);
    resolvedStages = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: "asc" },
    });
  }

  // Build fallback stage map for applications without currentStageId
  const fallbackStageMap: Record<string, string> = {};
  for (const app of applications) {
    if (!app.currentStageId) {
      const stage = resolveStageForStatus(app.status, resolvedStages);
      if (stage) fallbackStageMap[app.id] = stage.id;
    }
  }

  const isOwner = job.company.ownerId === userId;
  const isAdmin = userRole === "ADMIN";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-full px-4 py-6 space-y-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/me/employer/jobs" className="text-sm text-gray-400 hover:text-gray-600">
            ← All jobs
          </Link>
          {(isOwner || isAdmin) && (
            <div className="flex gap-2">
              <Link
                href={`/employer/${companyId}/jobs/${jobId}/team`}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 hover:border-gray-300"
              >
                Manage team
              </Link>
              <Link
                href={`/employer/${companyId}/pipeline-settings`}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 hover:border-gray-300"
              >
                Pipeline settings
              </Link>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto">
          <PipelineBoard
            jobId={jobId}
            jobTitle={job.title}
            stages={resolvedStages.map((s) => ({
              id: s.id,
              name: s.name,
              color: s.color,
              isInitial: s.isInitial,
              isHired: s.isHired,
              isRejected: s.isRejected,
              order: s.order,
            }))}
            applications={applications.map((a) => ({
              id: a.id,
              currentStageId: a.currentStageId,
              status: a.status,
              createdAt: a.createdAt.toISOString(),
              coverLetter: a.coverLetter,
              jobSeeker: a.jobSeeker,
              currentStage: a.currentStage
                ? { ...a.currentStage }
                : null,
            }))}
            fallbackStageMap={fallbackStageMap}
          />
        </div>
      </div>
    </main>
  );
}
