import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ListingCard from "@/components/shared/ListingCard";
import ListingFilters from "@/components/shared/ListingFilters";

interface SearchParams {
  region?: string;
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 20;

export default async function MarketplacePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  const regions = await prisma.region.findMany({
    select: { id: true, name: true, slug: true, city: true },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });

  const where: Prisma.ListingWhereInput = {
    status: "ACTIVE",
    ...(sp.region ? { region: { slug: sp.region } } : {}),
    ...(sp.propertyType ? { propertyType: sp.propertyType as "HOUSE" | "APARTMENT" | "PLOT" | "COMMERCIAL" | "OTHER" } : {}),
    ...(sp.minPrice || sp.maxPrice
      ? {
          price: {
            ...(sp.minPrice ? { gte: new Prisma.Decimal(sp.minPrice) } : {}),
            ...(sp.maxPrice ? { lte: new Prisma.Decimal(sp.maxPrice) } : {}),
          },
        }
      : {}),
    ...(sp.beds ? { beds: { gte: parseInt(sp.beds, 10) } } : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        region: { select: { id: true, name: true, slug: true, city: true } },
        sellerProfile: { select: { id: true, agentTier: true, user: { select: { id: true, name: true } } } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.listing.count({ where }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE);
  const spRecord = Object.fromEntries(
    Object.entries(sp).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Browse Listings</h1>
          <span className="text-sm text-gray-500">{total.toLocaleString()} results</span>
        </div>

        <ListingFilters regions={regions} searchParams={spRecord} />

        {listings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No listings found.</p>
            <p className="text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={{
                  ...listing,
                  price: listing.price.toString(),
                  images: listing.images.map((img) => ({
                    url: img.url,
                    width: img.width,
                    height: img.height,
                  })),
                }}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            {page > 1 && (
              <Link
                href={`/m?${new URLSearchParams({ ...spRecord, page: String(page - 1) }).toString()}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">Page {page} of {pages}</span>
            {page < pages && (
              <Link
                href={`/m?${new URLSearchParams({ ...spRecord, page: String(page + 1) }).toString()}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
