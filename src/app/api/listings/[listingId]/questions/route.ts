import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const askSchema = z.object({
  question: z.string().min(5).max(500),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    // Determine if the caller is the listing's seller
    let isSeller = false;
    const session = await getSession();
    if (session) {
      const userId = getUserId(session);
      const sellerProfile = await prisma.sellerProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (sellerProfile) {
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
          select: { sellerProfileId: true },
        });
        if (listing && listing.sellerProfileId === sellerProfile.id) {
          isSeller = true;
        }
      }
    }

    const questions = await prisma.listingQuestion.findMany({
      where: {
        listingId,
        ...(isSeller ? {} : { answer: { not: null } }),
      },
      include: {
        asker: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(questions);
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { listingId } = await params;

    const limited = await rateLimit(`listing:question:${listingId}:${userId}`, 3, 86400);
    if (!limited.allowed) return err("Too many requests", 429);

    const body = await req.json() as unknown;
    const parsed = askSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err("Listing not found", 404);
    if (listing.status !== "ACTIVE") return err("Listing is not active", 422);

    if (listing.sellerProfile?.userId === userId) {
      return err("You cannot ask a question on your own listing", 403);
    }

    const existing = await prisma.listingQuestion.count({
      where: { listingId, askerId: userId },
    });
    if (existing > 0) return err("You have already asked a question on this listing", 409);

    const question = await prisma.listingQuestion.create({
      data: {
        askerId: userId,
        listingId,
        question: parsed.data.question,
      },
    });

    return ok(question, 201);
  } catch (e) {
    return parseError(e);
  }
}
