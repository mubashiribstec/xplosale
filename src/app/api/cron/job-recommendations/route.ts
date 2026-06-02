import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRecommendations } from "@/verticals/jobs/recommendations/engine";

const BATCH_SIZE = parseInt(process.env.RECOMMENDATION_BATCH_SIZE ?? "200", 10);

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.RECOMMENDATION_CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let processedProfiles = 0;
  let totalRecommendations = 0;
  let cursor: string | undefined;

  while (true) {
    const profiles = await prisma.jobSeekerProfile.findMany({
      where: { recruiterDiscoverable: true },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      include: { user: true },
    });

    if (profiles.length === 0) break;
    cursor = profiles[profiles.length - 1].id;

    for (const profile of profiles) {
      // Load applied job IDs
      const applications = await prisma.application.findMany({
        where: { jobSeekerId: profile.id },
        select: { jobPostingId: true },
      });
      const appliedJobIds = new Set(applications.map((a) => a.jobPostingId));

      // Build job query based on preferred regions
      const preferredRegionIds = Array.isArray(profile.preferredRegionIds)
        ? (profile.preferredRegionIds as string[])
        : [];

      const jobWhere =
        preferredRegionIds.length > 0
          ? {
              status: "ACTIVE" as const,
              OR: [
                { regionId: { in: preferredRegionIds } },
                { remoteType: "REMOTE" as const },
              ],
            }
          : { status: "ACTIVE" as const, remoteType: "REMOTE" as const };

      const jobs = await prisma.jobPosting.findMany({
        where: jobWhere,
        orderBy: { createdAt: "desc" },
      });

      const scored = await computeRecommendations(profile, jobs, appliedJobIds);

      for (const { jobPostingId, score, reasons } of scored) {
        const existing = await prisma.jobRecommendation.findUnique({
          where: { jobSeekerId_jobPostingId: { jobSeekerId: profile.id, jobPostingId } },
        });

        if (existing) {
          // Update score/reasons but don't reset sentAt
          await prisma.jobRecommendation.update({
            where: { id: existing.id },
            data: { score, reasons },
          });
        } else {
          const rec = await prisma.jobRecommendation.create({
            data: {
              jobSeekerId: profile.id,
              jobPostingId,
              score,
              reasons,
            },
          });
          totalRecommendations++;

          // Send notification for high-score new recommendations
          if (score >= 0.5) {
            await prisma.notification.create({
              data: {
                userId: profile.userId,
                kind: "JOB_RECOMMENDED",
                payload: {
                  recommendationId: rec.id,
                  jobPostingId,
                  score,
                },
              },
            });
            await prisma.jobRecommendation.update({
              where: { id: rec.id },
              data: { sentAt: new Date() },
            });
          }
        }
      }

      processedProfiles++;
    }

    if (profiles.length < BATCH_SIZE) break;
  }

  return NextResponse.json({
    ok: true,
    data: { processed: processedProfiles, recommendations: totalRecommendations },
  });
}
