import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePipelineStages } from "@/verticals/jobs/ats/permissions";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
  kind: z.enum(["INTERVIEW_INVITE", "REJECT", "OFFER", "ASSESSMENT_INVITE", "CUSTOM"]).optional(),
});

async function getTemplateAndCheckAccess(templateId: string, userId: string, userRole: string) {
  const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!template) return null;
  const allowed = await canManagePipelineStages(userId, template.companyId, userRole);
  return allowed ? template : null;
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

    const template = await getTemplateAndCheckAccess(templateId, userId, userRole);
    if (!template) return err("Not found or forbidden", 404);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const updated = await prisma.emailTemplate.update({ where: { id: templateId }, data: parsed.data });
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

    const template = await getTemplateAndCheckAccess(templateId, userId, userRole);
    if (!template) return err("Not found or forbidden", 404);

    await prisma.emailTemplate.delete({ where: { id: templateId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
