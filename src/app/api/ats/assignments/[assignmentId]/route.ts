import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { assignmentId } = await params;

    const assignment = await prisma.testAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        template: {
          include: {
            questions: { orderBy: { order: "asc" } },
          },
        },
        application: {
          select: {
            id: true,
            jobPostingId: true,
            jobSeeker: { select: { userId: true } },
          },
        },
        session: true,
      },
    });

    if (!assignment) return err("Assignment not found", 404);

    const candidateUserId = assignment.application.jobSeeker.userId;
    const isCandidate = candidateUserId === userId;

    // Check access: candidate owns it OR hiring team member
    if (!isCandidate) {
      const canAccess = await canAccessJobApplications(
        userId,
        assignment.application.jobPostingId,
        userRole
      );
      if (!canAccess) return err("Forbidden", 403);
    }

    // If candidate, strip correctIds from MCQ question metadata
    if (isCandidate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (assignment.template as any).questions = assignment.template.questions.map((q) => {
        if (q.kind === "MCQ") {
          const meta = q.metadata as Record<string, unknown>;
          const { correctIds: _stripped, ...rest } = meta;
          void _stripped;
          return { ...q, metadata: rest as object };
        }
        return q;
      });
    }

    return ok(assignment);
  } catch (e) {
    return parseError(e);
  }
}
