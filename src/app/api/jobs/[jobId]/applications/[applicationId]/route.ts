import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";

const patchSchema = z.object({
  status: z.enum(["REVIEWED", "SHORTLISTED", "REJECTED", "HIRED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { jobId, applicationId } = await params;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return err("Job not found", 404);
    if (job.postedByUserId !== userId) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: { status: parsed.data.status },
      include: {
        jobSeeker: { select: { userId: true } },
      },
    });

    if (parsed.data.status === "SHORTLISTED" || parsed.data.status === "HIRED") {
      await createNotification(application.jobSeeker.userId, "JOB_APPLIED", {
        jobId,
        jobTitle: job.title,
        status: parsed.data.status,
        applicationId,
      });
    }

    return ok(application);
  } catch (e) {
    return parseError(e);
  }
}
