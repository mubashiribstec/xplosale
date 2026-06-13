import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";

interface Params {
  params: Promise<{ jobId: string }>;
}

/** POST /api/jobs/[jobId]/favourite — save a job to the user's favourites. */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { jobId } = await params;
    const job = await prisma.jobPosting.findUnique({ where: { id: jobId }, select: { status: true } });
    if (!job || job.status !== "ACTIVE") return err("Job not found", 404);

    try {
      await prisma.jobFavourite.create({ data: { jobPostingId: jobId, userId } });
    } catch (e) {
      // Already favourited — treat as success (idempotent)
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }

    return ok({ favourited: true });
  } catch (e) {
    return parseError(e);
  }
}

/** DELETE /api/jobs/[jobId]/favourite — remove a job from favourites. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { jobId } = await params;
    await prisma.jobFavourite.deleteMany({ where: { jobPostingId: jobId, userId } });

    return ok({ favourited: false });
  } catch (e) {
    return parseError(e);
  }
}
