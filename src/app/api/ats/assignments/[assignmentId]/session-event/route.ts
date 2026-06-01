import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const eventSchema = z.object({
  kind: z.enum(["focus_loss", "fullscreen_exit"]),
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
        session: true,
      },
    });

    if (!assignment) return err("Assignment not found", 404);
    if (assignment.application.jobSeeker.userId !== userId) return err("Forbidden", 403);
    if (assignment.status !== "IN_PROGRESS") return err("Assignment is not in progress", 422);
    if (!assignment.session) return err("No active session found", 404);

    const body = await req.json() as unknown;
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const updateData =
      parsed.data.kind === "focus_loss"
        ? { focusLossCount: { increment: 1 } }
        : { fullscreenExits: { increment: 1 } };

    const updatedSession = await prisma.testSession.update({
      where: { assignmentId },
      data: updateData,
    });

    return ok({
      focusLossCount: updatedSession.focusLossCount,
      fullscreenExits: updatedSession.fullscreenExits,
    });
  } catch (e) {
    return parseError(e);
  }
}
