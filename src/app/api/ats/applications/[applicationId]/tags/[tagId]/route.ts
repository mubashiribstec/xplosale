import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ applicationId: string; tagId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { applicationId, tagId } = await params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { jobPostingId: true },
    });
    if (!application) return err("Application not found", 404);

    const allowed = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!allowed) return err("Forbidden", 403);

    await prisma.applicationTag.deleteMany({ where: { applicationId, tagId } });
    return ok({ removed: true });
  } catch (e) {
    return parseError(e);
  }
}
