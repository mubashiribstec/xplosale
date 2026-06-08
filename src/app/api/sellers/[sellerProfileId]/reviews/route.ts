import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
  transactionRef: z.string().cuid().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sellerProfileId: string }> }
) {
  try {
    const { sellerProfileId } = await params;

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

    const [reviews, total, sellerProfile] = await Promise.all([
      prisma.sellerReview.findMany({
        where: { sellerProfileId },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sellerReview.count({ where: { sellerProfileId } }),
      prisma.sellerProfile.findUnique({
        where: { id: sellerProfileId },
        select: { sellerRatingAvg: true, sellerRatingCount: true },
      }),
    ]);

    if (!sellerProfile) return err("Seller not found", 404);

    return ok({
      reviews,
      total,
      page,
      pages: Math.ceil(total / limit),
      ratingAvg: sellerProfile.sellerRatingAvg,
      ratingCount: sellerProfile.sellerRatingCount,
    });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sellerProfileId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { sellerProfileId } = await params;

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { rating, body: reviewBody, transactionRef } = parsed.data;

    // Fetch the target seller profile
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: { id: true, userId: true, badges: true, sellerRatingAvg: true, sellerRatingCount: true },
    });
    if (!sellerProfile) return err("Seller not found", 404);

    // Cannot review own profile
    if (sellerProfile.userId === userId) {
      return err("You cannot review your own seller profile", 403);
    }

    if (transactionRef) {
      // transactionRef is a listingId — verify an RELEASED escrow for that listing
      const transaction = await prisma.escrowTransaction.findFirst({
        where: {
          listingId: transactionRef,
          buyerId: userId,
          status: "RELEASED",
        },
      });
      if (!transaction) {
        return err("No completed purchase found for that listing", 422);
      }
    } else {
      // No specific listing — check any RELEASED escrow with this seller
      const transaction = await prisma.escrowTransaction.findFirst({
        where: {
          buyerId: userId,
          status: "RELEASED",
          listing: { sellerProfileId },
        },
      });
      if (!transaction) {
        return err("You must have completed a purchase from this seller to leave a review", 422);
      }
    }

    const review = await prisma.sellerReview.create({
      data: {
        sellerProfileId,
        authorId: userId,
        rating,
        body: reviewBody ?? null,
        transactionRef: transactionRef ?? null,
      },
    });

    // Recalculate aggregate ratings
    const agg = await prisma.sellerReview.aggregate({
      where: { sellerProfileId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const newAvg = agg._avg.rating ?? 0;
    const newCount = agg._count.rating;

    // Determine badges to award
    const existingBadges: string[] = sellerProfile.badges ?? [];

    // Fetch verificationStatus for TRUSTED badge check
    const sellerUser = await prisma.user.findUnique({
      where: { id: sellerProfile.userId },
      select: { verificationStatus: true },
    });

    const badgesToAdd: string[] = [];
    if (
      !existingBadges.includes("TRUSTED") &&
      sellerUser?.verificationStatus === "VERIFIED" &&
      newAvg >= 4 &&
      newCount >= 5
    ) {
      badgesToAdd.push("TRUSTED");
    }
    if (!existingBadges.includes("TOP_RATED") && newAvg >= 4.5 && newCount >= 10) {
      badgesToAdd.push("TOP_RATED");
    }

    await prisma.sellerProfile.update({
      where: { id: sellerProfileId },
      data: {
        sellerRatingAvg: newAvg,
        sellerRatingCount: newCount,
        ...(badgesToAdd.length > 0
          ? { badges: { push: badgesToAdd } }
          : {}),
      },
    });

    return ok(review, 201);
  } catch (e) {
    return parseError(e);
  }
}
