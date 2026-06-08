import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const answerSchema = z.object({
  answer: z.string().min(1).max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string; questionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { listingId, questionId } = await params;

    const body = await req.json() as unknown;
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    // Fetch the question and confirm it belongs to this listing
    const question = await prisma.listingQuestion.findUnique({
      where: { id: questionId },
      include: {
        listing: {
          select: {
            sellerProfileId: true,
            sellerProfile: { select: { userId: true } },
          },
        },
      },
    });

    if (!question) return err("Question not found", 404);
    if (question.listingId !== listingId) return err("Question does not belong to this listing", 404);

    // Verify caller is the seller
    if (question.listing.sellerProfile?.userId !== userId) {
      return err("Forbidden", 403);
    }

    if (question.answeredAt !== null) {
      return err("Already answered", 409);
    }

    const updated = await prisma.listingQuestion.update({
      where: { id: questionId },
      data: {
        answer: parsed.data.answer,
        answeredAt: new Date(),
      },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
