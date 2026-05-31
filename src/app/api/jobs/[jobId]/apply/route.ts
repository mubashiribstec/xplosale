import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom, createNotification } from "@/core/messaging/rooms";

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

    const jobSeekerId_profile = await prisma.jobSeekerProfile.findUnique({ where: { userId } });
    if (!jobSeekerId_profile) return err("Create a job seeker profile first", 422);

    if (!jobSeekerId_profile.resumeUrl) return err("Upload a resume first", 422);

    const jobPosting = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!jobPosting) return err("Job not found", 404);
    if (jobPosting.status !== "ACTIVE") return err("Job is not accepting applications", 422);
    if (jobPosting.postedByUserId === userId) return err("Cannot apply to your own job posting", 422);

    const body = await req.json() as unknown;
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

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
