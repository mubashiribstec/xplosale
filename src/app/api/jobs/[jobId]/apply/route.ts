import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom, createNotification } from "@/core/messaging/rooms";
import { getUserTier } from "@/lib/tier";

const applySchema = z.object({
  coverLetter: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { jobId } = await params;

    const [jobSeekerId_profile, dbUser] = await Promise.all([
      prisma.jobSeekerProfile.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { verificationStatus: true, isPartner: true } }),
    ]);
    if (!jobSeekerId_profile) return err("Create a job seeker profile first", 422);

    if (!jobSeekerId_profile.resumeUrl) return err("Upload a resume first", 422);

    const tier = getUserTier({ isPartner: dbUser?.isPartner ?? false, verificationStatus: dbUser?.verificationStatus ?? "UNVERIFIED" });
    if (tier === "BASIC") {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const todayCount = await prisma.application.count({
        where: { applicantUserId: userId, createdAt: { gte: dayStart } },
      });
      if (todayCount >= 10) {
        return err("Daily application limit reached (10/day for Basic accounts). Verify your identity to apply without limits.", 429);
      }
    }

    const jobPosting = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!jobPosting) return err("Job not found", 404);
    if (jobPosting.status !== "ACTIVE") return err("Job is not accepting applications", 422);
    if (jobPosting.postedByUserId === userId) return err("Cannot apply to your own job posting", 422);

    const body = await req.json() as unknown;
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    // Place the new application in the company's initial pipeline stage so it
    // shows up on the Kanban board immediately (keeps dual-write in sync).
    const initialStage = await prisma.pipelineStage.findFirst({
      where: { companyId: jobPosting.companyId, isInitial: true },
      select: { id: true },
      orderBy: { order: "asc" },
    });

    const application = await prisma.application.upsert({
      where: {
        jobPostingId_jobSeekerId: {
          jobPostingId: jobId,
          jobSeekerId: jobSeekerId_profile.id,
        },
      },
      update: {
        coverLetter: parsed.data.coverLetter,
        status: "APPLIED",
      },
      create: {
        jobPostingId: jobId,
        jobSeekerId: jobSeekerId_profile.id,
        applicantUserId: userId,
        resumeUrl: jobSeekerId_profile.resumeUrl,
        coverLetter: parsed.data.coverLetter,
        status: "APPLIED",
        currentStageId: initialStage?.id ?? null,
      },
    });

    const employerUserId = jobPosting.postedByUserId;
    const [pA, pB] = [userId, employerUserId].sort();
    const room = await getOrCreateRoom("JOB_APPLICATION", jobId, pA, pB);

    await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: userId,
        body: "Application submitted",
        kind: "SYSTEM",
        metadata: { applicationId: application.id },
      },
    });

    await createNotification(employerUserId, "JOB_APPLIED", {
      jobId,
      jobTitle: jobPosting.title,
      applicantName: (session.user as { name?: string | null }).name ?? "",
      roomId: room.id,
    });

    return ok({ applicationId: application.id, roomId: room.id });
  } catch (e) {
    return parseError(e);
  }
}
