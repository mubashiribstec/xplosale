import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("unpublish") }),
  z.object({ action: z.literal("void_submission"), submissionId: z.string() }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);
    const { templateId } = await params;

    const template = await prisma.testTemplate.findUnique({ where: { id: templateId } });
    if (!template) return err("Template not found", 404);

    const body = await req.json() as unknown;
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    if (parsed.data.action === "unpublish") {
      await prisma.$transaction([
        prisma.testTemplate.update({
          where: { id: templateId },
          data: { isPublished: false },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "unpublish_test_template",
            targetType: "TestTemplate",
            targetId: templateId,
          },
        }),
      ]);

      return ok({ action: "unpublish", templateId });
    }

    // void_submission
    const { submissionId } = parsed.data;

    const submission = await prisma.testSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, assignmentId: true },
    });

    if (!submission) return err("Submission not found", 404);

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.testSubmission.update({
        where: { id: submissionId },
        data: {
          manualScore: 0,
          graderNotes: "Voided by admin",
          gradedByUserId: adminId,
          gradedAt: now,
        },
      });

      // Re-fetch all submissions for this assignment to recalculate score
      const allSubmissions = await tx.testSubmission.findMany({
        where: { assignmentId: submission.assignmentId },
        select: {
          id: true,
          autoScore: true,
          manualScore: true,
          question: { select: { points: true } },
        },
      });

      const totalPoints = allSubmissions.reduce((sum, s) => sum + s.question.points, 0);
      const earned = allSubmissions.reduce((sum, s) => {
        // The voided submission now has manualScore=0 after the update above
        const score = s.manualScore !== null && s.manualScore !== undefined
          ? s.manualScore
          : (s.autoScore ?? 0);
        return sum + score;
      }, 0);

      const newScorePercent = totalPoints > 0 ? (earned / totalPoints) * 100 : 0;

      await tx.testAssignment.update({
        where: { id: submission.assignmentId },
        data: { scorePercent: newScorePercent },
      });

      await tx.adminActionLog.create({
        data: {
          adminId,
          action: "void_submission",
          targetType: "TestSubmission",
          targetId: submissionId,
        },
      });
    });

    return ok({ action: "void_submission", submissionId });
  } catch (e) {
    return parseError(e);
  }
}
