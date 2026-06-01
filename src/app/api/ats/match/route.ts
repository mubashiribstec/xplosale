import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";
import { recomputeMatchForApplication, recomputeMatchesForJob } from "@/verticals/jobs/ats/recompute-match";

const schema = z.union([
  z.object({ applicationId: z.string().cuid() }),
  z.object({ jobPostingId: z.string().cuid() }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const role = (session.user as { role: string }).role;

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Provide applicationId or jobPostingId", 422);

    if ("applicationId" in parsed.data) {
      const { applicationId } = parsed.data;
      const { prisma } = await import("@/lib/prisma");
      const app = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { jobPostingId: true },
      });
      if (!app) return err("Application not found", 404);
      const allowed = await canAccessJobApplications(userId, app.jobPostingId, role);
      if (!allowed) return err("Forbidden", 403);
      await recomputeMatchForApplication(applicationId);
    } else {
      const { jobPostingId } = parsed.data;
      const allowed = await canAccessJobApplications(userId, jobPostingId, role);
      if (!allowed) return err("Forbidden", 403);
      await recomputeMatchesForJob(jobPostingId);
    }

    return ok({ recomputed: true });
  } catch (e) {
    return parseError(e);
  }
}
