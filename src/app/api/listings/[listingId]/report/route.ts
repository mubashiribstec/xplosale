import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const reportSchema = z.object({
  reason: z.enum(["SPAM", "FRAUD", "MISLEADING", "PROHIBITED", "DUPLICATE", "OTHER"]),
  details: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const limited = await rateLimit(`listing:report:${userId}`, 5, 3600);
    if (!limited.allowed) return err("Too many requests", 429);

    const { listingId } = await params;

    const body = await req.json() as unknown;
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err("Listing not found", 404);
    if (listing.status !== "ACTIVE") return err("Listing not found", 404);
    if (listing.sellerProfile?.userId === userId) {
      return err("You cannot report your own listing", 403);
    }

    const existing = await prisma.listingReport.findUnique({
      where: { listingId_reporterId: { listingId, reporterId: userId } },
    });
    if (existing) {
      return err("You have already reported this listing", 409);
    }

    const report = await prisma.listingReport.create({
      data: {
        listingId,
        reporterId: userId,
        reason: parsed.data.reason,
        details: parsed.data.details,
      },
    });

    return ok(report, 201);
  } catch (e) {
    return parseError(e);
  }
}
