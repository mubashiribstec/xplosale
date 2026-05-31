import { type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

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
            user: { select: { id: true, name: true } },
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
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err("Listing not found", 404);
    if (listing.sellerProfile.userId !== userId && !isAdmin) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { price, status, ...rest } = parsed.data;

    if (status && !isAdmin) {
      if (!(listing.status === "DRAFT" && status === "PENDING_REVIEW")) {
        return err("Invalid status transition", 422);
      }
    }

    const updated = await prisma.listing.update({
      where: { id: listingId },
      data: {
        ...rest,
        ...(price !== undefined ? { price: new Prisma.Decimal(price) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

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
    if (listing.sellerProfile.userId !== userId && !isAdmin) return err("Forbidden", 403);

    await prisma.listing.delete({ where: { id: listingId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
