import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPresignedGet } from "@/core/adapters/storage";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return err("Job not found", 404);

    const userRole = (session.user as { role: string }).role;
    const allowed = await canAccessJobApplications(userId, jobId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const applications = await prisma.application.findMany({
      where: { jobPostingId: jobId },
      include: {
        jobSeeker: {
          select: {
            id: true,
            headline: true,
            user: { select: { id: true, name: true } },
          },
        },
        currentStage: { select: { id: true, name: true, color: true, isHired: true, isRejected: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const applicationsWithResume = await Promise.all(
      applications.map(async (app) => {
        const resumeSignedUrl = await getPresignedGet("private", app.resumeUrl, 300);
        return { ...app, resumeSignedUrl };
      })
    );

    return ok(applicationsWithResume);
  } catch (e) {
    return parseError(e);
  }
}
