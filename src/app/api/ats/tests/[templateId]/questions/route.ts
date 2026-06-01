import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const createQuestionSchema = z.object({
  kind: z.enum(["MCQ", "FREE_TEXT", "VIDEO", "FILE_UPLOAD", "CODING"]).default("MCQ"),
  body: z.string().min(1).max(2000),
  points: z.number().int().min(1).max(100).default(1),
  order: z.number().int().min(1).optional(),
  metadata: z.record(z.unknown()).default({}),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { templateId } = await params;

    // Check access: owner, admin, or hiring team member
    let allowed = await checkOwnerAccess(templateId, userId, userRole);
    if (!allowed) {
      const template = await prisma.testTemplate.findUnique({
        where: { id: templateId },
        select: { companyId: true },
      });
      if (template) {
        const isTeamMember = await prisma.hiringTeam.findFirst({
          where: { userId, jobPosting: { companyId: template.companyId } },
        });
        allowed = !!isTeamMember;
      }
    }
    if (!allowed) return err("Forbidden", 403);

    const questions = await prisma.testQuestion.findMany({
      where: { templateId },
      orderBy: { order: "asc" },
    });

    return ok(questions);
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { templateId } = await params;

    const allowed = await checkOwnerAccess(templateId, userId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { kind, body: questionBody, points, order, metadata } = parsed.data;

    // Determine order: provided or max+1
    let questionOrder = order;
    if (!questionOrder) {
      const maxQuestion = await prisma.testQuestion.findFirst({
        where: { templateId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      questionOrder = (maxQuestion?.order ?? 0) + 1;
    }

    const question = await prisma.testQuestion.create({
      data: {
        templateId,
        kind,
        body: questionBody,
        points,
        order: questionOrder,
        metadata,
      },
    });

    return ok(question, 201);
  } catch (e) {
    return parseError(e);
  }
}
