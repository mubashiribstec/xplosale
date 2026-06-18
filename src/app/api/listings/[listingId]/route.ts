import { type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserTier, getListingExpiryDays } from "@/lib/tier";

const patchSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(5000).optional(),
  price: z.number().positive().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "EXPIRED", "SOLD"]).optional(),
  propertyType: z.enum(["HOUSE", "APARTMENT", "PLOT", "COMMERCIAL", "OTHER"]).optional(),
  beds: z.number().int().positive().optional(),
  baths: z.number().int().positive().optional(),
  areaValue: z.number().positive().optional(),
  areaUnit: z.string().max(20).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  regionId: z.string().cuid().optional(),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]).optional(),
  negotiable: z.boolean().optional(),
  urgent: z.boolean().optional(),
  sellerType: z.enum(["PRIVATE", "BUSINESS"]).optional(),
  deliveryAvailable: z.boolean().optional(),
  deliveryCost: z.number().nonnegative().optional(),
  action: z.enum(["renew", "bump"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: { orderBy: { order: "asc" } },
        region: { select: { id: true, name: true, slug: true, city: true } },
        sellerProfile: {
          select: {
            id: true,
            agentTier: true,
            sellerRatingAvg: true,
            sellerRatingCount: true,
            responseRate: true,
            badges: true,
            user: { select: { id: true, name: true, image: true, verificationStatus: true } },
          },
        },
        reviews: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!listing) return err("Listing not found", 404);

    return ok(listing);
  } catch (e) {
    return parseError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as { role: string }).role === "ADMIN";

    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        sellerProfile: {
          select: {
            userId: true,
            user: { select: { isPartner: true, verificationStatus: true, hasVerifiedBadge: true } },
          },
        },
      },
    });
    if (!listing) return err("Listing not found", 404);
    if (!listing.sellerProfile || (listing.sellerProfile.userId !== userId && !isAdmin)) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { price, status, action, deliveryCost, ...rest } = parsed.data;

    // Handle special actions
    if (action === "renew") {
      if (!["ACTIVE", "EXPIRED"].includes(listing.status)) return err("Only ACTIVE or EXPIRED listings can be renewed", 422);
      const tier = getUserTier(listing.sellerProfile.user);
      const renewed = await prisma.listing.update({
        where: { id: listingId },
        data: { expiresAt: new Date(Date.now() + getListingExpiryDays(tier) * 24 * 60 * 60 * 1000), renewedAt: new Date() },
      });
      return ok(renewed);
    }

    if (action === "bump") {
      if (listing.status !== "ACTIVE") return err("Only ACTIVE listings can be bumped", 422);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      if (listing.bumpedAt && listing.bumpedAt > sevenDaysAgo && !isAdmin) {
        return err("You can only bump a listing once every 7 days", 429);
      }
      const bumped = await prisma.listing.update({ where: { id: listingId }, data: { bumpedAt: new Date() } });
      return ok(bumped);
    }

    if (status && !isAdmin) {
      const allowed =
        (listing.status === "DRAFT" && status === "PENDING_REVIEW") ||
        (listing.status === "REJECTED" && status === "DRAFT") ||
        (listing.status === "ACTIVE" && status === "SOLD") ||
        (listing.status === "SOLD" && status === "ACTIVE") ||
        (listing.status === "EXPIRED" && status === "ACTIVE");
      if (!allowed) return err("Invalid status transition", 422);
    }

    // Record price history + notify saved-listing users when price drops
    const extraOps: Prisma.PrismaPromise<unknown>[] = [];
    if (price !== undefined && listing.price.toNumber() > price) {
      const oldPrice = listing.price;
      extraOps.push(
        prisma.listingPriceHistory.create({
          data: { listingId, oldPrice, newPrice: new Prisma.Decimal(price) },
        })
      );
      const savers = await prisma.savedListing.findMany({ where: { listingId }, select: { userId: true } });
      for (const { userId: saverId } of savers) {
        extraOps.push(
          prisma.notification.create({
            data: {
              userId: saverId,
              kind: "PRICE_DROP",
              payload: {
                listingId,
                title: listing.title,
                oldPrice: oldPrice.toNumber(),
                newPrice: price,
                currency: listing.currency,
              },
            },
          })
        );
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.listing.update({
        where: { id: listingId },
        data: {
          ...rest,
          ...(price !== undefined ? { price: new Prisma.Decimal(price) } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(deliveryCost !== undefined ? { deliveryCost: new Prisma.Decimal(deliveryCost) } : {}),
        },
      }),
      ...extraOps,
    ]);

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as { role: string }).role === "ADMIN";

    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err("Listing not found", 404);
    if (!listing.sellerProfile || (listing.sellerProfile.userId !== userId && !isAdmin)) return err("Forbidden", 403);

    await prisma.listing.delete({ where: { id: listingId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
