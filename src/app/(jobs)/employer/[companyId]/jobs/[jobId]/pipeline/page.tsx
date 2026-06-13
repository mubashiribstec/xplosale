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

  const [job, stages, applications, tags] = await Promise.all([
    prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        companyId: true,
        requiredSkills: true,
        niceToHaveSkills: true,
        requiredKeywords: true,
        company: { select: { ownerId: true } },
      },
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
        applicationTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
        candidateMatch: {
          select: {
            score: true,
            requiredMatched: true,
            requiredTotal: true,
            matchedTerms: true,
            missedTerms: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.candidateTag.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
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
  const hasSkills =
    (job.requiredSkills as string[]).length > 0 ||
    (job.niceToHaveSkills as string[]).length > 0 ||
    (job.requiredKeywords as string[]).length > 0;

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-full px-4 py-6 space-y-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link
            href="/me/employer/jobs"
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--ink-faint)" }}
          >
            ← All jobs
          </Link>
          <div className="flex gap-2 flex-wrap">
            {!hasSkills && (
              <span
                className="text-xs border rounded px-2 py-1"
                style={{ color: "var(--clay)", background: "rgba(160,78,55,.12)", borderColor: "var(--line)" }}
              >
                Add required skills to the job to enable match scoring
              </span>
            )}
            {(isOwner || isAdmin) && (
              <>
                <Link
                  href={`/employer/${companyId}/jobs/${jobId}/team`}
                  className="text-xs border rounded px-2 py-1 hover:opacity-80 transition-opacity"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
                >
                  Manage team
                </Link>
                <Link
                  href={`/employer/${companyId}/pipeline-settings`}
                  className="text-xs border rounded px-2 py-1 hover:opacity-80 transition-opacity"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
                >
                  Pipeline settings
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <PipelineBoard
            jobId={jobId}
            companyId={companyId}
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
              currentStage: a.currentStage ? { ...a.currentStage } : null,
              applicationTags: a.applicationTags,
              match: a.candidateMatch
                ? {
                    score: a.candidateMatch.score,
                    requiredMatched: a.candidateMatch.requiredMatched,
                    requiredTotal: a.candidateMatch.requiredTotal,
                    matchedTerms: a.candidateMatch.matchedTerms as string[],
                    missedTerms: a.candidateMatch.missedTerms as string[],
                  }
                : null,
            }))}
            fallbackStageMap={fallbackStageMap}
            tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
          />
        </div>
      </div>
    </main>
  );
}
