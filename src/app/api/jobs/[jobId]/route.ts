import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(10000).optional(),
  remoteType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  regionId: z.string().cuid().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "EXPIRED"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        region: true,
        _count: { select: { applications: true } },
      },
    });

    if (!job) return err("Job not found", 404);

    return ok(job);
  } catch (e) {
    return parseError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as unknown as { role: string }).role === "ADMIN";

    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return err("Job not found", 404);
    if (job.postedByUserId !== userId && !isAdmin) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { status, ...rest } = parsed.data;

    if (status && !isAdmin) {
      if (!(job.status === "DRAFT" && status === "ACTIVE")) {
        return err("Invalid status transition", 422);
      }
    }

    const updated = await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        ...rest,
        ...(status !== undefined ? { status } : {}),
      },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as unknown as { role: string }).role === "ADMIN";

    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return err("Job not found", 404);
    if (job.postedByUserId !== userId && !isAdmin) return err("Forbidden", 403);

    await prisma.jobPosting.delete({ where: { id: jobId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
