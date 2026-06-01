import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { kvSet } from "@/core/adapters/kv";

const autosaveSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

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
        application: { select: { jobSeeker: { select: { userId: true } } } },
        session: { select: { endsAt: true } },
      },
    });

    if (!assignment) return err("Assignment not found", 404);
    if (assignment.application.jobSeeker.userId !== userId) return err("Forbidden", 403);
    if (assignment.status !== "IN_PROGRESS") return err("Assignment is not in progress", 422);

    const body = await req.json() as unknown;
    const parsed = autosaveSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    // Calculate TTL: remaining seconds from endsAt + 15 min, min 0
    const now = Date.now();
    const endsAt = assignment.session?.endsAt?.getTime() ?? now;
    const remainingMs = Math.max(0, endsAt - now);
    const ttlSeconds = Math.max(0, Math.floor(remainingMs / 1000) + 15 * 60);

    await kvSet(
      `assignment:${assignmentId}:state`,
      JSON.stringify(parsed.data.answers),
      ttlSeconds
    );

    return ok({ saved: true });
  } catch (e) {
    return parseError(e);
  }
}
