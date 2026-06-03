import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeRecommendations } from "@/verticals/jobs/recommendations/engine";
import type { User } from "@prisma/client";

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
    // G3: select only the fields we actually need — don't fetch full User record
    const profiles = await prisma.jobSeekerProfile.findMany({
      where: { recruiterDiscoverable: true },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: "asc" },
      select: {
        id: true,
        userId: true,
        headline: true,
        summary: true,
        currentRoleTitle: true,
        openToWork: true,
        resumeUrl: true,
        expectedSalaryMin: true,
        expectedSalaryMax: true,
        currency: true,
        recruiterDiscoverable: true,
        preferredRemoteType: true,
        preferredRegionIds: true,
        doNotRecommendCompanyIds: true,
      },
    });

    if (profiles.length === 0) break;
    cursor = profiles[profiles.length - 1].id;

    // G2: fetch jobs ONCE per batch (not per profile), cap at 200 most-recent active jobs
    const allActiveJobs = await prisma.jobPosting.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    for (const profile of profiles) {
      // Load applied job IDs for this profile
      const applications = await prisma.application.findMany({
        where: { jobSeekerId: profile.id },
        select: { jobPostingId: true },
      });
      const appliedJobIds = new Set(applications.map((a) => a.jobPostingId));

      // Filter the already-fetched job list by region preference
      const preferredRegionIds = Array.isArray(profile.preferredRegionIds)
        ? (profile.preferredRegionIds as string[])
        : [];
      const relevantJobs = allActiveJobs.filter((j) =>
        preferredRegionIds.length === 0
          ? j.remoteType === "REMOTE"
          : preferredRegionIds.includes(j.regionId) || j.remoteType === "REMOTE"
      );

      // computeRecommendations expects JobSeekerProfile & { user: User }
      // The engine body never reads any user.* fields, so we supply an empty stub.
      const profileWithUser = { ...profile, user: {} as User };

      const scored = await computeRecommendations(profileWithUser, relevantJobs, appliedJobIds);
      if (scored.length === 0) {
        processedProfiles++;
        continue;
      }

      // G1: batch lookup of existing recommendations instead of one findUnique per job
      const jobIds = scored.map((s) => s.jobPostingId);
      const existingRecs = await prisma.jobRecommendation.findMany({
        where: { jobSeekerId: profile.id, jobPostingId: { in: jobIds } },
        select: { id: true, jobPostingId: true },
      });
      const existingMap = new Map(existingRecs.map((r) => [r.jobPostingId, r.id]));

      const toUpdate = scored.filter((s) => existingMap.has(s.jobPostingId));
      const toCreate = scored.filter((s) => !existingMap.has(s.jobPostingId));

      // Batch update existing recommendations
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((s) =>
            prisma.jobRecommendation.update({
              where: { id: existingMap.get(s.jobPostingId)! },
              data: { score: s.score, reasons: s.reasons },
            })
          )
        );
      }

      // Batch create new recommendations
      if (toCreate.length > 0) {
        const created = await prisma.jobRecommendation.createManyAndReturn({
          data: toCreate.map((s) => ({
            jobSeekerId: profile.id,
            jobPostingId: s.jobPostingId,
            score: s.score,
            reasons: s.reasons,
          })),
          select: { id: true, jobPostingId: true, score: true },
        });
        totalRecommendations += created.length;

        // Batch notifications for high-score new recommendations
        const highScore = created.filter((r) => r.score >= 0.5);
        if (highScore.length > 0) {
          await Promise.all(
            highScore.map((r) =>
              prisma.notification.create({
                data: {
                  userId: profile.userId,
                  kind: "JOB_RECOMMENDED",
                  payload: {
                    recommendationId: r.id,
                    jobPostingId: r.jobPostingId,
                    score: r.score,
                  },
                },
              })
            )
          );
          await prisma.jobRecommendation.updateMany({
            where: { id: { in: highScore.map((r) => r.id) } },
            data: { sentAt: new Date() },
          });
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
