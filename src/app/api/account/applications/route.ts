import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const jobSeekerProfile = await prisma.jobSeekerProfile.findUnique({ where: { userId } });
    if (!jobSeekerProfile) return err("Job seeker profile not found", 404);

    const applications = await prisma.application.findMany({
      where: { jobSeekerId: jobSeekerProfile.id },
      include: {
        jobPosting: {
          select: {
            id: true,
            title: true,
            status: true,
            company: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(applications);
  } catch (e) {
    return parseError(e);
  }
}
