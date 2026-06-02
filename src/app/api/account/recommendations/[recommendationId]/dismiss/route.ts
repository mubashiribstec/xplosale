import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ recommendationId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { recommendationId } = await params;

    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return err("Job seeker profile not found", 404);

    const rec = await prisma.jobRecommendation.findUnique({ where: { id: recommendationId } });
    if (!rec) return err("Recommendation not found", 404);
    if (rec.jobSeekerId !== profile.id) return err("Forbidden", 403);

    await prisma.jobRecommendation.delete({ where: { id: recommendationId } });

    return ok({ dismissed: true });
  } catch (e) {
    return parseError(e);
  }
}
