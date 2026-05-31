import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const authorId = getUserId(session);

    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return err("Listing not found", 404);
    if (listing.status !== "ACTIVE" && listing.status !== "SOLD") {
      return err("Reviews are only allowed on active or sold listings", 422);
    }

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const review = await prisma.listingReview.upsert({
      where: { listingId_authorId: { listingId, authorId } },
      update: { rating: parsed.data.rating, body: parsed.data.body ?? null },
      create: { listingId, authorId, rating: parsed.data.rating, body: parsed.data.body ?? null },
    });

    return ok(review);
  } catch (e) {
    return parseError(e);
  }
}
