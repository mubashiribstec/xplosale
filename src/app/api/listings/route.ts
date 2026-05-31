import { type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

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
    const statusParam = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const status = statusParam && isAdmin ? statusParam : "ACTIVE";

    const where: Prisma.ListingWhereInput = {
      status: status as Prisma.EnumListingStatusFilter,
    };

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
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
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

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!sellerProfile) return err("SellerProfile not found", 404);

    const { price, ...rest } = parsed.data;
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const listing = await prisma.listing.create({
      data: {
        ...rest,
        price: new Prisma.Decimal(price),
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
