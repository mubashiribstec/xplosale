import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("pause") }),
]);

type Params = { params: Promise<{ jobId: string }> };

/** POST /api/admin/jobs/[jobId] — approve (publish) or pause a job posting */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { jobId } = await params;
    const job = await prisma.jobPosting.findUnique({ where: { id: jobId }, select: { id: true, status: true } });
    if (!job) return err("Job not found", 404);

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action } = parsed.data;

    if (action === "approve" && job.status !== "DRAFT" && job.status !== "CLOSED") {
      return err("Only draft or paused jobs can be approved.", 422);
    }
    if (action === "pause" && job.status !== "ACTIVE") {
      return err("Only active jobs can be paused.", 422);
    }

    const newStatus = action === "approve" ? "ACTIVE" : "CLOSED";
    const logAction = action === "approve" ? "JOB_APPROVED" : "JOB_PAUSED";

    await prisma.$transaction([
      prisma.jobPosting.update({ where: { id: jobId }, data: { status: newStatus } }),
      prisma.adminActionLog.create({
        data: { adminId, action: logAction, targetType: "JobPosting", targetId: jobId, reason: null },
      }),
    ]);

    return ok({ status: newStatus });
  } catch (e) {
    return parseError(e);
  }
}

/** DELETE /api/admin/jobs/[jobId] — permanently delete a job posting */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { jobId } = await params;
    const job = await prisma.jobPosting.findUnique({ where: { id: jobId }, select: { id: true, title: true } });
    if (!job) return err("Job not found", 404);

    await prisma.$transaction([
      prisma.jobPosting.delete({ where: { id: jobId } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "JOB_DELETED",
          targetType: "JobPosting",
          targetId: jobId,
          reason: `Deleted job: ${job.title}`,
        },
      }),
    ]);

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
