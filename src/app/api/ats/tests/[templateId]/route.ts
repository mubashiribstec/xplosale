import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  durationMin: z.number().int().min(1).max(300).optional(),
  passingScorePercent: z.number().int().min(0).max(100).nullable().optional(),
  isPublished: z.boolean().optional(),
});

async function checkTemplateAccess(
  templateId: string,
  userId: string,
  userRole: string
): Promise<{ allowed: boolean; template: { id: string; companyId: string; company: { ownerId: string } } | null }> {
  const template = await prisma.testTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, companyId: true, company: { select: { ownerId: true } } },
  });

  if (!template) return { allowed: false, template: null };
  if (userRole === "ADMIN") return { allowed: true, template };
  if (template.company.ownerId === userId) return { allowed: true, template };

  const isTeamMember = await prisma.hiringTeam.findFirst({
    where: { userId, jobPosting: { companyId: template.companyId } },
  });
  return { allowed: !!isTeamMember, template };
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

    const { allowed } = await checkTemplateAccess(templateId, userId, userRole);
    if (!allowed) return err("Not found or forbidden", 404);

    const template = await prisma.testTemplate.findUnique({
      where: { id: templateId },
      include: {
        questions: { orderBy: { order: "asc" } },
        _count: { select: { assignments: true } },
      },
    });

    if (!template) return err("Not found", 404);
    return ok(template);
  } catch (e) {
    return parseError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { templateId } = await params;

    const { allowed, template } = await checkTemplateAccess(templateId, userId, userRole);
    if (!template) return err("Not found", 404);
    // Only owner or admin can modify
    if (userRole !== "ADMIN" && template.company.ownerId !== userId) return err("Forbidden", 403);
    if (!allowed) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const updated = await prisma.testTemplate.update({
      where: { id: templateId },
      data: parsed.data,
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { templateId } = await params;

    const { template } = await checkTemplateAccess(templateId, userId, userRole);
    if (!template) return err("Not found", 404);
    if (userRole !== "ADMIN" && template.company.ownerId !== userId) return err("Forbidden", 403);

    // Only delete if no GRADED assignments exist
    const gradedCount = await prisma.testAssignment.count({
      where: { templateId, status: "GRADED" },
    });
    if (gradedCount > 0) {
      return err(`Cannot delete: ${gradedCount} graded assignment(s) exist`, 422);
    }

    await prisma.testTemplate.delete({ where: { id: templateId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
