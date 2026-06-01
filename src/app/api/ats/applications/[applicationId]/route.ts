import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";
import { getPresignedGet } from "@/core/adapters/storage";

export async function GET(
  _req: NextRequest,
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
      include: {
        jobPosting: { select: { id: true, title: true, companyId: true } },
        jobSeeker: {
          select: {
            id: true,
            headline: true,
            summary: true,
            currentRoleTitle: true,
            expectedSalaryMin: true,
            expectedSalaryMax: true,
            currency: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        currentStage: { select: { id: true, name: true, color: true } },
        applicationTags: {
          include: { tag: { select: { id: true, name: true, color: true } } },
        },
      },
    });

    if (!application) return err("Application not found", 404);

    const allowed = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const resumeUrl = await getPresignedGet("private", application.resumeUrl, 300);

    return ok({ ...application, resumeUrl });
  } catch (e) {
    return parseError(e);
  }
}
