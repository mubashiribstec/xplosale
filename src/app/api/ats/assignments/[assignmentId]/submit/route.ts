import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { kvDel } from "@/core/adapters/kv";

const submitSchema = z.object({
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
        template: {
          include: { questions: true },
        },
        application: {
          select: {
            jobSeeker: {
              select: {
                userId: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!assignment) return err("Assignment not found", 404);
    if (assignment.application.jobSeeker.userId !== userId) return err("Forbidden", 403);

    // Allow submission if ASSIGNED (instant submit) or IN_PROGRESS
    if (assignment.status !== "IN_PROGRESS" && assignment.status !== "ASSIGNED") {
      return err("Assignment cannot be submitted in its current state", 422);
    }

    const body = await req.json() as unknown;
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { answers } = parsed.data;
    const questions = assignment.template.questions;

    // Auto-grade MCQ questions
    let totalPoints = 0;
    let totalAutoScore = 0;
    let hasNonMcq = false;

    const submissionsData = questions.map((question) => {
      const answer = answers[question.id] ?? null;
      let autoScore: number | null = null;

      if (question.kind === "MCQ") {
        const meta = question.metadata as Record<string, unknown>;
        const correctIds: string[] = Array.isArray(meta.correctIds) ? (meta.correctIds as string[]) : [];
        const candidateAnswer = answer as { selectedIds?: string[] } | null;
        const selectedIds: string[] = Array.isArray(candidateAnswer?.selectedIds)
          ? candidateAnswer!.selectedIds
          : [];

        // Order-independent comparison
        const correct =
          correctIds.length === selectedIds.length &&
          [...correctIds].sort().join(",") === [...selectedIds].sort().join(",");

        autoScore = correct ? question.points : 0;
        totalPoints += question.points;
        totalAutoScore += autoScore;
      } else {
        hasNonMcq = true;
        totalPoints += question.points;
      }

      return {
        assignmentId,
        questionId: question.id,
        answer: (answer ?? {}) as object,
        autoScore,
      };
    });

    const scorePercent = totalPoints > 0 ? (totalAutoScore / totalPoints) * 100 : 0;
    const status = hasNonMcq ? "PENDING_GRADE" : "GRADED";
    const autoGraded = !hasNonMcq;
    const now = new Date();

    // Upsert submissions and update assignment in transaction
    await prisma.$transaction(async (tx) => {
      for (const sub of submissionsData) {
        await tx.testSubmission.upsert({
          where: { assignmentId_questionId: { assignmentId: sub.assignmentId, questionId: sub.questionId } },
          create: {
            assignmentId: sub.assignmentId,
            questionId: sub.questionId,
            answer: sub.answer,
            autoScore: sub.autoScore,
          },
          update: {
            answer: sub.answer,
            autoScore: sub.autoScore,
          },
        });
      }

      await tx.testAssignment.update({
        where: { id: assignmentId },
        data: {
          status: status as "GRADED" | "PENDING_GRADE",
          submittedAt: now,
          scorePercent: autoGraded ? scorePercent : null,
          autoGraded,
        },
      });

      // Notify the assigner
      const candidateName = assignment.application.jobSeeker.user.name ?? "Candidate";
      await tx.notification.create({
        data: {
          userId: assignment.assignedByUserId,
          kind: "MENTION",
          payload: {
            assignmentId,
            candidateName,
            scorePercent: autoGraded ? scorePercent : null,
          },
        },
      });
    });

    // Delete Redis autosave key
    await kvDel(`assignment:${assignmentId}:state`).catch(() => {});

    return ok({
      status,
      autoGraded,
      scorePercent: autoGraded ? scorePercent : null,
    });
  } catch (e) {
    return parseError(e);
  }
}
