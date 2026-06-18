import { type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getUserTier, getListingExpiryDays } from "@/lib/tier";
import { rateLimit } from "@/lib/rate-limit";

const LISTING_LIMITS: Record<string, number> = { BASIC: 2, VERIFIED: 20, PARTNER: Infinity };

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  price: z.number().positive(),
  category: z.string().default("real_estate"),
  regionId: z.string().cuid(),
  propertyType: z.enum(["HOUSE", "APARTMENT", "PLOT", "COMMERCIAL", "OTHER"]).optional(),
  beds: z.number().int().positive().optional(),
  baths: z.number().int().positive().optional(),
  areaValue: z.number().positive().optional(),
  areaUnit: z.string().max(20).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]).optional(),
  negotiable: z.boolean().default(true),
  urgent: z.boolean().default(false),
  sellerType: z.enum(["PRIVATE", "BUSINESS"]).default("PRIVATE"),
  deliveryAvailable: z.boolean().default(false),
  deliveryCost: z.number().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session && (session.user as { role: string }).role === "ADMIN";

    const { searchParams } = req.nextUrl;
    const regionSlug = searchParams.get("regionSlug");
    const propertyType = searchParams.get("propertyType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const beds = searchParams.get("beds");
    const keyword = searchParams.get("keyword");
    const statusParam = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const LISTING_STATUSES = ["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "EXPIRED", "SOLD"] as const;
    type ListingStatus = (typeof LISTING_STATUSES)[number];
    const isValidStatus = (s: string): s is ListingStatus =>
      (LISTING_STATUSES as readonly string[]).includes(s);
    // Non-admins are always pinned to ACTIVE; admins may filter by a valid status only.
    const status: ListingStatus =
      isAdmin && statusParam && isValidStatus(statusParam) ? statusParam : "ACTIVE";

    const where: Prisma.ListingWhereInput = { status };

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: "insensitive" } },
        { description: { contains: keyword, mode: "insensitive" } },
      ];
    }

    if (regionSlug) {
      where.region = { slug: regionSlug };
    }

    if (propertyType) {
      where.propertyType = propertyType as Prisma.EnumPropertyTypeNullableFilter;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Prisma.DecimalFilter).gte = new Prisma.Decimal(minPrice);
      if (maxPrice) (where.price as Prisma.DecimalFilter).lte = new Prisma.Decimal(maxPrice);
    }

    if (beds) {
      where.beds = { gte: parseInt(beds, 10) };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          images: { orderBy: { order: "asc" }, take: 1 },
          region: { select: { id: true, name: true, slug: true, city: true } },
          sellerProfile: {
            select: {
              id: true,
              agentTier: true,
              user: { select: { id: true, name: true, verificationStatus: true, isPartner: true } },
            },
          },
        },
        orderBy: [
          { sellerProfile: { user: { isPartner: "desc" } } },
          { featured: "desc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.listing.count({ where }),
    ]);

    return ok({ listings, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const limited = await rateLimit(`listings:create:${userId}`, 10, 3600);
    if (!limited.allowed) return err("Too many requests", 429);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const [sellerProfile, dbUser] = await Promise.all([
      prisma.sellerProfile.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { verificationStatus: true, isPartner: true, bannedSections: true, bannedMarketplaceCategories: true } }),
    ]);
    if (!sellerProfile) return err("SellerProfile not found", 404);

    // Section/category ban check
    if (dbUser?.bannedSections.includes("MARKETPLACE")) return err("You are not allowed to post in the marketplace.", 403);
    const category = parsed.data.category;
    if (dbUser?.bannedMarketplaceCategories.includes(category)) return err(`You are not allowed to post in the ${category} category.`, 403);

    const tier = getUserTier({ isPartner: dbUser?.isPartner ?? false, verificationStatus: dbUser?.verificationStatus ?? "UNVERIFIED" });
    const limit = LISTING_LIMITS[tier] ?? 2;
    if (limit !== Infinity) {
      // Count every slot the user occupies — a draft/pending listing still
      // counts, otherwise the cap is trivially bypassed by never publishing.
      const usedCount = await prisma.listing.count({
        where: {
          sellerProfileId: sellerProfile.id,
          status: { in: ["DRAFT", "PENDING_REVIEW", "ACTIVE"] },
        },
      });
      if (usedCount >= limit) return err(`Listing limit (${limit}) reached for ${tier} accounts. Verify your identity to post more.`, 403);
    }

    const { price, deliveryCost, ...rest } = parsed.data;
    const expiresAt = new Date(Date.now() + getListingExpiryDays(tier) * 24 * 60 * 60 * 1000);

    const listing = await prisma.listing.create({
      data: {
        ...rest,
        price: new Prisma.Decimal(price),
        ...(deliveryCost !== undefined ? { deliveryCost: new Prisma.Decimal(deliveryCost) } : {}),
        sellerProfileId: sellerProfile.id,
        status: "DRAFT",
        expiresAt,
      },
    });

    return ok(listing, 201);
  } catch (e) {
    return parseError(e);
  }
}
