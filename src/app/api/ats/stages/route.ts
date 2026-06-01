import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePipelineStages } from "@/verticals/jobs/ats/permissions";
import { logAdminAction } from "@/core/audit";

const stageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(50),
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B7280"),
  isInitial: z.boolean().default(false),
  isHired: z.boolean().default(false),
  isRejected: z.boolean().default(false),
});

const putSchema = z.object({
  companyId: z.string(),
  stages: z.array(stageSchema).min(1).max(20),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) return err("companyId required", 400);

    const allowed = await canManagePipelineStages(userId, companyId, userRole);
    if (!allowed) {
      // Also allow hiring team members to read stages
      const isTeamMember = await prisma.hiringTeam.findFirst({
        where: { userId, jobPosting: { companyId } },
      });
      if (!isTeamMember) return err("Forbidden", 403);
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { order: "asc" },
    });

    return ok(stages);
  } catch (e) {
    return parseError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const body = await req.json() as unknown;
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { companyId, stages } = parsed.data;

    const allowed = await canManagePipelineStages(userId, companyId, userRole);
    if (!allowed) return err("Forbidden", 403);

    // Validate at most one isInitial, isHired, isRejected
    if (stages.filter((s) => s.isInitial).length > 1) return err("Only one initial stage allowed", 422);
    if (stages.filter((s) => s.isHired).length > 1) return err("Only one hired stage allowed", 422);
    if (stages.filter((s) => s.isRejected).length > 1) return err("Only one rejected stage allowed", 422);

    const existingStages = await prisma.pipelineStage.findMany({ where: { companyId } });
    const existingIds = new Set(existingStages.map((s) => s.id));
    const incomingIds = new Set(stages.filter((s) => s.id).map((s) => s.id!));

    // Delete removed stages (only if no applications are in them)
    const toDelete = existingStages.filter((s) => !incomingIds.has(s.id));
    for (const stage of toDelete) {
      const count = await prisma.application.count({ where: { currentStageId: stage.id } });
      if (count > 0) return err(`Stage "${stage.name}" has ${count} application(s) — move them first`, 422);
      await prisma.pipelineStage.delete({ where: { id: stage.id } });
    }

    // Upsert each stage
    const result = await prisma.$transaction(
      stages.map((s) =>
        s.id && existingIds.has(s.id)
          ? prisma.pipelineStage.update({
              where: { id: s.id },
              data: { name: s.name, order: s.order, color: s.color, isInitial: s.isInitial, isHired: s.isHired, isRejected: s.isRejected },
            })
          : prisma.pipelineStage.create({
              data: { companyId, name: s.name, order: s.order, color: s.color, isInitial: s.isInitial, isHired: s.isHired, isRejected: s.isRejected },
            })
      )
    );

    await logAdminAction({
      adminId: userId,
      action: "PIPELINE_STAGES_UPDATED",
      targetType: "Company",
      targetId: companyId,
    });

    return ok(result);
  } catch (e) {
    return parseError(e);
  }
}
