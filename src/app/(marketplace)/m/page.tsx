import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ListingCard from "@/components/shared/ListingCard";
import MarketplaceShell from "./_components/MarketplaceShell";

interface SearchParams {
  q?: string;
  category?: string;
  region?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  condition?: string;
  verified?: string;
  sort?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 24;

const CATEGORIES = [
  "All",
  "Vehicles",
  "Mobiles",
  "Electronics",
  "Property",
  "Home & Living",
  "Appliances",
  "Fashion",
  "Gaming",
];

export default async function MarketplacePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const sort = sp.sort ?? "recent";

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    ...(sp.q ? { title: { contains: sp.q, mode: "insensitive" } } : {}),
    ...(sp.category && sp.category !== "All"
      ? { category: { contains: sp.category, mode: "insensitive" } }
      : {}),
    ...(sp.region ? { region: { slug: sp.region } } : {}),
    ...(sp.propertyType
      ? { propertyType: sp.propertyType as "HOUSE" | "APARTMENT" | "PLOT" | "COMMERCIAL" | "OTHER" }
      : {}),
    ...(sp.minPrice || sp.maxPrice
      ? {
          price: {
            ...(sp.minPrice ? { gte: new Prisma.Decimal(sp.minPrice) } : {}),
            ...(sp.maxPrice ? { lte: new Prisma.Decimal(sp.maxPrice) } : {}),
          },
        }
      : {}),
    ...(sp.beds ? { beds: { gte: parseInt(sp.beds, 10) } } : {}),
    ...(sp.verified === "1"
      ? { sellerProfile: { agentTier: { in: ["PRO" as const] } } }
      : {}),
  };

  const orderBy: Prisma.ListingOrderByWithRelationInput[] =
    sort === "price_asc"
      ? [{ price: "asc" }]
      : sort === "price_desc"
      ? [{ price: "desc" }]
      : [{ featured: "desc" }, { createdAt: "desc" }];

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
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.listing.count({ where }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);

  const serialisedListings = listings.map((l) => ({
    ...l,
    price: l.price.toString(),
    createdAt: l.createdAt.toISOString(),
    expiresAt: l.expiresAt?.toISOString() ?? null,
    fbrValuationMin: l.fbrValuationMin?.toString() ?? null,
    fbrValuationMax: l.fbrValuationMax?.toString() ?? null,
    updatedAt: l.updatedAt.toISOString(),
    images: l.images.map((img) => ({
      url: img.url,
      width: img.width,
      height: img.height,
    })),
  }));

  return (
    <MarketplaceShell
      categories={CATEGORIES}
      listings={serialisedListings}
      total={total}
      pages={pages}
      currentPage={page}
      currentSort={sort}
      searchParams={sp as Record<string, string>}
    />
  );
}
