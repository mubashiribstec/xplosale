import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { kvSet } from "@/core/adapters/kv";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const { assignmentId } = await params;

    const assignment = await prisma.testAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        template: { select: { durationMin: true } },
        application: { select: { jobSeeker: { select: { userId: true } } } },
        session: true,
      },
    });

    if (!assignment) return err("Assignment not found", 404);

    // Only candidate can start
    if (assignment.application.jobSeeker.userId !== userId) return err("Forbidden", 403);

    // Idempotent: if already IN_PROGRESS, return existing session
    if (assignment.status === "IN_PROGRESS" && assignment.session) {
      return ok({ assignment, session: assignment.session });
    }

    if (assignment.status !== "ASSIGNED" && assignment.status !== "IN_PROGRESS") {
      return err("Assignment cannot be started in its current state", 422);
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + assignment.template.durationMin * 60 * 1000);

    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined;
    const userAgent = req.headers.get("user-agent") ?? undefined;

    const [updatedAssignment, testSession] = await prisma.$transaction([
      prisma.testAssignment.update({
        where: { id: assignmentId },
        data: { status: "IN_PROGRESS", startedAt: now },
      }),
      prisma.testSession.create({
        data: {
          assignmentId,
          startedAt: now,
          endsAt,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      }),
    ]);

    // Store empty autosave state in Redis
    const ttlSeconds = (assignment.template.durationMin + 15) * 60;
    await kvSet(`assignment:${assignmentId}:state`, "{}", ttlSeconds);

    return ok({ assignment: updatedAssignment, session: testSession }, 201);
  } catch (e) {
    return parseError(e);
  }
}
