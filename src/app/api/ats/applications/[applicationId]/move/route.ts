import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";
import { logAdminAction } from "@/core/audit";
import { ApplicationStatus } from "@prisma/client";

const moveSchema = z.object({ stageId: z.string() });

// Map hired/rejected stage flags to legacy ApplicationStatus
function statusFromStage(stage: { isHired: boolean; isRejected: boolean; isInitial: boolean }): ApplicationStatus {
  if (stage.isHired) return "HIRED";
  if (stage.isRejected) return "REJECTED";
  if (stage.isInitial) return "APPLIED";
  return "REVIEWED";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { applicationId } = await params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, jobPostingId: true, currentStageId: true, jobPosting: { select: { companyId: true } } },
    });
    if (!application) return err("Application not found", 404);

    const allowed = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = moveSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    // Stage must belong to the same company as the application
    const stage = await prisma.pipelineStage.findFirst({
      where: { id: parsed.data.stageId, companyId: application.jobPosting.companyId },
    });
    if (!stage) return err("Stage not found", 404);

    const legacyStatus = statusFromStage(stage);

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { currentStageId: stage.id, status: legacyStatus },
    });

    await logAdminAction({
      adminId: userId,
      action: "APPLICATION_STAGE_MOVED",
      targetType: "Application",
      targetId: applicationId,
      reason: `Moved to stage "${stage.name}"`,
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
