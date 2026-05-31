import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePipelineStages } from "@/verticals/jobs/ats/permissions";
import { logAdminAction } from "@/core/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string; memberId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { jobId, memberId } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { companyId: true },
    });
    if (!job) return err("Job not found", 404);

    const allowed = await canManagePipelineStages(userId, job.companyId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const member = await prisma.hiringTeam.findUnique({ where: { id: memberId } });
    if (!member || member.jobPostingId !== jobId) return err("Team member not found", 404);

    await prisma.hiringTeam.delete({ where: { id: memberId } });

    await logAdminAction({
      adminId: userId,
      action: "HIRING_TEAM_MEMBER_REMOVED",
      targetType: "JobPosting",
      targetId: jobId,
      reason: `Removed member ${memberId}`,
    });

    return ok({ removed: true });
  } catch (e) {
    return parseError(e);
  }
}
