import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const patchQuestionSchema = z.object({
  body: z.string().min(1).max(2000).optional(),
  points: z.number().int().min(1).max(100).optional(),
  order: z.number().int().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

async function checkOwnerAccess(
  templateId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") return true;
  const template = await prisma.testTemplate.findUnique({
    where: { id: templateId },
    select: { company: { select: { ownerId: true } } },
  });
  if (!template) return false;
  return template.company.ownerId === userId;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string; questionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { templateId, questionId } = await params;

    const allowed = await checkOwnerAccess(templateId, userId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const question = await prisma.testQuestion.findUnique({
      where: { id: questionId, templateId },
    });
    if (!question) return err("Question not found", 404);

    const body = await req.json() as unknown;
    const parsed = patchQuestionSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { metadata, ...rest } = parsed.data;
    const updated = await prisma.testQuestion.update({
      where: { id: questionId },
      data: {
        ...rest,
        ...(metadata !== undefined ? { metadata: metadata as object } : {}),
      },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string; questionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { templateId, questionId } = await params;

    const allowed = await checkOwnerAccess(templateId, userId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const question = await prisma.testQuestion.findUnique({
      where: { id: questionId, templateId },
      select: { id: true, order: true },
    });
    if (!question) return err("Question not found", 404);

    // Delete the question and reorder remaining (decrement order > deleted.order)
    await prisma.$transaction([
      prisma.testQuestion.delete({ where: { id: questionId } }),
      prisma.testQuestion.updateMany({
        where: { templateId, order: { gt: question.order } },
        data: { order: { decrement: 1 } },
      }),
    ]);

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
