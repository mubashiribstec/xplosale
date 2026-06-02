import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}
function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try { return (JSON.parse(Buffer.from(cursor, "base64url").toString()) as { offset: number }).offset; }
  catch { return 0; }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const profile = await prisma.jobSeekerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return err("Job seeker profile not found", 404);

    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const limit = 20;
    const offset = decodeCursor(cursor);

    const recs = await prisma.jobRecommendation.findMany({
      where: { jobSeekerId: profile.id },
      orderBy: { score: "desc" },
      take: limit + 1,
      skip: offset,
      include: {
        jobPosting: {
          select: {
            id: true,
            title: true,
            remoteType: true,
            salaryMin: true,
            salaryMax: true,
            currency: true,
            status: true,
            createdAt: true,
            company: { select: { id: true, name: true } },
            region: { select: { id: true, name: true } },
          },
        },
      },
    });

    const hasMore = recs.length > limit;
    const items = hasMore ? recs.slice(0, limit) : recs;
    const nextCursor = hasMore ? encodeCursor(offset + limit) : null;

    return ok({ items, nextCursor });
  } catch (e) {
    return parseError(e);
  }
}
