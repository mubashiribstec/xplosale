import { type NextRequest } from "next/server";
import { ok, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    const session = await getSession();
    const userId = session ? getUserId(session) : null;
    const ip = req.headers.get("x-forwarded-for") ?? "anon";

    const rateLimitKey = `listing:view:${listingId}:${userId ?? ip}`;
    const result = await rateLimit(rateLimitKey, 1, 86400);

    if (!result.allowed) {
      return ok({ counted: false });
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { viewCount: { increment: 1 } },
    });

    return ok({ counted: true });
  } catch (e) {
    return parseError(e);
  }
}
