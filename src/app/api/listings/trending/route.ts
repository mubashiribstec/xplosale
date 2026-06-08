import { type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ok, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type TrendingListing = {
  id: string;
  sellerProfileId: string;
  category: string;
  title: string;
  description: string;
  price: unknown;
  currency: string;
  regionId: string;
  lat: number | null;
  lng: number | null;
  status: string;
  featured: boolean;
  expiresAt: Date | null;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  areaValue: number | null;
  areaUnit: string | null;
  fbrValuationMin: unknown | null;
  fbrValuationMax: unknown | null;
  videoUrl: string | null;
  condition: string | null;
  negotiable: boolean;
  urgent: boolean;
  sellerType: string;
  deliveryAvailable: boolean;
  deliveryCost: unknown | null;
  viewCount: number;
  savedCount: number;
  contactCount: number;
  renewedAt: Date | null;
  bumpedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  score: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10)));
    const regionId = searchParams.get("regionId");

    const listings = await prisma.$queryRaw<TrendingListing[]>`
      SELECT l.*,
        (l."viewCount" * 0.4 + l."savedCount" * 0.4 + l."contactCount" * 0.2) as score
      FROM "Listing" l
      WHERE l.status = 'ACTIVE'
        AND l."updatedAt" > NOW() - INTERVAL '30 days'
        ${regionId ? Prisma.sql`AND l."regionId" = ${regionId}` : Prisma.empty}
      ORDER BY score DESC
      LIMIT ${limit}
    `;

    if (listings.length === 0) return ok(listings);

    const listingIds = listings.map((l) => l.id);

    const images = await prisma.listingImage.findMany({
      where: { listingId: { in: listingIds }, order: 0 },
      select: { id: true, listingId: true, url: true, order: true, width: true, height: true },
    });

    const imagesByListingId = new Map<string, typeof images[number][]>();
    for (const img of images) {
      const existing = imagesByListingId.get(img.listingId) ?? [];
      existing.push(img);
      imagesByListingId.set(img.listingId, existing);
    }

    const listingsWithImages = listings.map((l) => ({
      ...l,
      images: imagesByListingId.get(l.id) ?? [],
    }));

    return ok(listingsWithImages);
  } catch (e) {
    return parseError(e);
  }
}
