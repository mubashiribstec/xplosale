import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import { searchClient } from "@/core/search/postgres";
import { encodeCursor } from "@/core/search/query";
import { getSession } from "@/core/auth/session";
import type { ListingHit } from "@/core/search/postgres";
import ListingCard from "@/components/shared/ListingCard";
import MarketplaceShell from "./_components/MarketplaceShell";

export const metadata: Metadata = {
  title: "Marketplace — Xplosale",
  description:
    "Browse thousands of verified listings across Pakistan. Buy and sell with confidence — identity-verified sellers, escrow-protected transactions.",
  openGraph: {
    title: "Marketplace — Xplosale",
    description: "Verified listings across Pakistan. Escrow-protected transactions.",
    type: "website",
  },
  alternates: { canonical: "/m" },
};

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

async function resolveRegionId(slug: string | undefined): Promise<string | undefined> {
  if (!slug) return undefined;
  const r = await prisma.region.findUnique({ where: { slug }, select: { id: true } });
  return r?.id;
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const [sp, session] = await Promise.all([searchParams, getSession()]);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));

  // Map URL sort param to search engine sort values
  const urlSort = sp.sort ?? "recent";
  const searchSort =
    urlSort === "price_asc" ? "price_asc" :
    urlSort === "price_desc" ? "price_desc" :
    "newest"; // "recent" → "newest"

  const regionId = await resolveRegionId(sp.region);

  const filters: Record<string, unknown> = {};
  if (regionId) filters.regionId = regionId;
  if (sp.category && sp.category !== "All") filters.category = sp.category;
  if (sp.propertyType) filters.propertyType = sp.propertyType;
  if (sp.minPrice) filters.priceMin = Number(sp.minPrice);
  if (sp.maxPrice) filters.priceMax = Number(sp.maxPrice);
  if (sp.beds) filters.beds = parseInt(sp.beds, 10);

  const cursor = page > 1 ? encodeCursor((page - 1) * PAGE_SIZE) : undefined;

  // Fetch search results
  const result = await searchClient.search<ListingHit>({
    vertical: "marketplace",
    query: sp.q ?? "",
    filters,
    sort: searchSort,
    cursor,
    limit: PAGE_SIZE,
  });

  // Keep a separate count query for total pagination
  const countWhere: Record<string, unknown> = { status: "ACTIVE" };
  if (regionId) countWhere.regionId = regionId;
  if (sp.category && sp.category !== "All") countWhere.category = { contains: sp.category, mode: "insensitive" };
  if (sp.q) countWhere.title = { contains: sp.q, mode: "insensitive" };
  if (sp.propertyType) countWhere.propertyType = sp.propertyType;
  if (sp.beds) countWhere.beds = { gte: parseInt(sp.beds, 10) };
  if (sp.minPrice || sp.maxPrice) {
    const priceFilter: Record<string, unknown> = {};
    if (sp.minPrice) priceFilter.gte = Number(sp.minPrice);
    if (sp.maxPrice) priceFilter.lte = Number(sp.maxPrice);
    countWhere.price = priceFilter;
  }

  const total = await prisma.listing.count({ where: countWhere as Prisma.ListingWhereInput });
  const pages = Math.ceil(total / PAGE_SIZE);

  // Map ListingHit to the shape MarketplaceShell / ListingCard expects
  const serialisedListings = result.hits.map((hit) => ({
    id: hit.id,
    title: hit.title,
    price: String(hit.price),
    currency: hit.currency,
    category: hit.category,
    propertyType: hit.propertyType ?? null,
    beds: hit.beds ?? null,
    createdAt: hit.createdAt instanceof Date ? hit.createdAt.toISOString() : String(hit.createdAt),
    region: { name: hit.regionName, city: hit.regionCity },
    images: hit.imageUrl
      ? [{ url: getPublicUrl(hit.imageUrl), width: hit.imageWidth ?? 0, height: hit.imageHeight ?? 0 }]
      : [],
    sellerProfile: { agentTier: hit.sellerAgentTier ?? "NONE" },
  }));

  const noFilters = !sp.q && !sp.category && !sp.region && page === 1;

  return (
    <>
      {noFilters && (
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "16px clamp(16px,4vw,32px) 0",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #f0f9ff, #fff)",
            border: "1.5px solid #e0f2fe",
            borderRadius: 16, padding: "16px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0369a1", margin: 0, fontFamily: "var(--body)" }}>
              📦 Got something to sell? List it for free in minutes.
            </p>
            <Link
              href={session ? "/me/listings/new" : "/login?redirect=/me/listings/new"}
              style={{
                padding: "9px 18px", background: "#0369a1", color: "#fff",
                borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
                fontFamily: "var(--body)", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              Post a listing →
            </Link>
          </div>
        </div>
      )}
      <MarketplaceShell
        categories={CATEGORIES}
        listings={serialisedListings}
        total={total}
        pages={pages}
        currentPage={page}
        currentSort={urlSort}
        searchParams={sp as Record<string, string>}
      />
    </>
  );
}
