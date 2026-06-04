import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ListingCard from "@/components/shared/ListingCard";
import { getPublicUrl } from "@/core/adapters/storage";
import { serializeJsonLd } from "@/lib/json-ld";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ city: string; category: string }>;
}

const CATEGORY_MAP: Record<string, string> = {
  vehicles: "Vehicles",
  mobiles: "Mobiles",
  electronics: "Electronics",
  property: "Property",
  "home-living": "Home & Living",
  appliances: "Appliances",
  fashion: "Fashion",
  gaming: "Gaming",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city, category } = await params;

  const region = await prisma.region.findFirst({
    where: { slug: city },
    select: { city: true },
  });
  if (!region) return { title: "Category | Xplosale" };

  const categoryLabel = CATEGORY_MAP[category];
  if (!categoryLabel) return { title: "Category | Xplosale" };

  const title = `${categoryLabel} in ${region.city} | Xplosale`;
  const description = `Browse verified ${categoryLabel.toLowerCase()} listings in ${region.city}. Escrow-protected transactions and identity-verified sellers.`;

  return {
    title,
    description,
    alternates: { canonical: `/${city}/${category}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export async function generateStaticParams() {
  try {
    const regions = await prisma.region.findMany({ select: { slug: true } });
    const categories = Object.keys(CATEGORY_MAP);
    return regions.flatMap((r) => categories.map((cat) => ({ city: r.slug, category: cat })));
  } catch {
    return [];
  }
}

export default async function CityCategoryPage({ params }: Props) {
  const { city, category } = await params;

  const categoryLabel = CATEGORY_MAP[category];
  if (!categoryLabel) notFound();

  const region = await prisma.region.findFirst({
    where: { slug: city },
    select: { id: true, city: true, name: true, slug: true },
  });
  if (!region) notFound();

  // Normalize category slug → stored category string
  const dbCategory = categoryLabel;

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      regionId: region.id,
      category: { contains: dbCategory, mode: "insensitive" },
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 24,
    include: {
      images: { take: 1, orderBy: { order: "asc" } },
      region: { select: { name: true, city: true } },
      sellerProfile: {
        select: {
          agentTier: true,
          user: { select: { id: true, name: true, verificationStatus: true, isPartner: true } },
        },
      },
    },
  });

  const listingCount = await prisma.listing.count({
    where: {
      status: "ACTIVE",
      regionId: region.id,
      category: { contains: dbCategory, mode: "insensitive" },
    },
  });

  const serialisedListings = listings.map((l) => ({
    id: l.id,
    title: l.title,
    price: String(l.price),
    currency: l.currency,
    category: l.category,
    propertyType: l.propertyType ?? null,
    beds: l.beds ?? null,
    createdAt: l.createdAt.toISOString(),
    region: { name: l.region.name, city: l.region.city },
    images: l.images[0] ? [{ url: getPublicUrl(l.images[0].url), width: 0, height: 0 }] : [],
    sellerProfile: { agentTier: l.sellerProfile?.agentTier ?? "NONE" },
  }));

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://xplosale.com" },
      { "@type": "ListItem", position: 2, name: "Marketplace", item: "https://xplosale.com/m" },
      { "@type": "ListItem", position: 3, name: region.city, item: `https://xplosale.com/${city}` },
      { "@type": "ListItem", position: 4, name: categoryLabel, item: `https://xplosale.com/${city}/${category}` },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span>/</span>
          <Link href="/m" className="hover:text-gray-600">Marketplace</Link>
          <span>/</span>
          <Link href={`/${city}`} className="hover:text-gray-600">{region.city}</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">{categoryLabel}</span>
        </nav>

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {categoryLabel} in {region.city}
          </h1>
          <p className="text-gray-500 mt-1">
            {listingCount.toLocaleString()} listing{listingCount !== 1 ? "s" : ""}
          </p>
        </div>

        {serialisedListings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No {categoryLabel.toLowerCase()} listings in {region.city} yet.{" "}
            <Link href="/m/new" className="text-blue-600 underline">Post yours</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {serialisedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}

        {listingCount > 24 && (
          <div className="text-center pt-4">
            <Link
              href={`/m?region=${city}&category=${categoryLabel}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              View all {listingCount.toLocaleString()} listings →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
