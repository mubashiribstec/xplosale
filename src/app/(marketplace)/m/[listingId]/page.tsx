import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import OfferButton from "@/components/shared/OfferButton";
import EscrowWidget from "@/components/shared/EscrowWidget";
import MessageSellerButton from "@/components/shared/marketplace/MessageSellerButton";
import ShareButton from "@/components/shared/ShareButton";
import SaveListingButton from "@/components/shared/marketplace/SaveListingButton";
import ReportListingButton from "@/components/shared/marketplace/ReportListingButton";
import ListingQA from "@/components/shared/marketplace/ListingQA";
import SimilarListings from "@/components/shared/marketplace/SimilarListings";
import { serializeJsonLd } from "@/lib/json-ld";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ listingId: string }> }
): Promise<Metadata> {
  const { listingId } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: {
      title: true, description: true, price: true, currency: true,
      images: { select: { url: true }, take: 1, orderBy: { order: "asc" } },
      region: { select: { name: true, city: true } },
    },
  });
  if (!listing) return { title: "Listing not found" };

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://xplosale.com";
  const price = `${listing.currency} ${Number(listing.price).toLocaleString("en-PK")}`;
  const description = `${price} · ${listing.region.city}, ${listing.region.name} · ${listing.description?.slice(0, 150) ?? ""}`;
  const imageUrl = listing.images[0]?.url
    ? `${base}/api/upload/serve-public/${listing.images[0].url}`
    : undefined;

  return {
    title: `${listing.title} — ${price} | Xplosale`,
    description,
    openGraph: {
      title: listing.title,
      description,
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    twitter: { card: "summary_large_image", title: listing.title, description },
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { listingId } = await params;
  const session = await getSession();

  const [listing, savedEntry] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: { orderBy: { order: "asc" } },
        region: { select: { id: true, name: true, slug: true, city: true } },
        sellerProfile: {
          select: {
            id: true,
            agentTier: true,
            bio: true,
            sellerRatingAvg: true,
            sellerRatingCount: true,
            responseRate: true,
            badges: true,
            user: { select: { id: true, name: true, image: true, verificationStatus: true, isPartner: true } },
          },
        },
        reviews: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        escrowTransactions: {
          where: { status: { in: ["HELD", "DISPUTED"] } },
          take: 1,
          select: { id: true, status: true, amount: true, buyerId: true, sellerId: true },
        },
        questions: {
          orderBy: { createdAt: "asc" },
          include: { asker: { select: { id: true, name: true } } },
        },
        priceHistory: { orderBy: { changedAt: "desc" }, take: 10 },
      },
    }),
    session
      ? prisma.savedListing.findUnique({
          where: {
            userId_listingId: {
              userId: (session.user as { id: string }).id,
              listingId,
            },
          },
          select: { id: true },
        })
      : null,
  ]);

  if (!listing) notFound();

  const userId = session ? (session.user as { id: string }).id : null;
  const isOwner = userId === listing.sellerProfile.user.id;
  const isAdmin = session && (session.user as { role: string }).role === "ADMIN";

  if (listing.status !== "ACTIVE" && !isOwner && !isAdmin) notFound();

  const price = Number(listing.price).toLocaleString("en-PK");
  const activeEscrow = listing.escrowTransactions[0] ?? null;
  const activeEscrowSerialized = activeEscrow
    ? {
        id: activeEscrow.id,
        status: activeEscrow.status,
        amount: activeEscrow.amount.toString(),
        buyerId: activeEscrow.buyerId,
        sellerId: activeEscrow.sellerId,
      }
    : null;

  const initialSaved = !!savedEntry;
  const initialSavedCount = listing.savedCount;

  // Serialize questions for client component
  const serializedQuestions = listing.questions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    answeredAt: q.answeredAt?.toISOString() ?? null,
    asker: { name: q.asker.name },
  }));

  const BADGE_STYLES: Record<string, string> = {
    TRUSTED: "bg-blue-50 text-blue-700",
    TOP_RATED: "bg-yellow-50 text-yellow-700",
    QUICK_RESPONDER: "bg-green-50 text-green-700",
  };

  const CONDITION_STYLES: Record<string, string> = {
    NEW: "bg-green-50 text-green-700",
    USED: "bg-orange-50 text-orange-700",
    REFURBISHED: "bg-blue-50 text-blue-700",
  };

  // Fire view count (optimistic, non-blocking) — we increment server-side via a fetch
  // This is handled by the ViewTracker client component below

  return (
    <main className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: listing.title,
            description: listing.description,
            offers: {
              "@type": "Offer",
              price: Number(listing.price),
              priceCurrency: listing.currency,
              availability: "https://schema.org/InStock",
              seller: { "@type": "Person", name: listing.sellerProfile?.user?.name ?? "Seller" },
            },
          }),
        }}
      />

      {/* View tracker — fires once on mount */}
      <ViewTracker listingId={listing.id} />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {listing.status !== "ACTIVE" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            This listing is <strong>{listing.status.toLowerCase().replace("_", " ")}</strong> and only visible to you.
          </div>
        )}

        {listing.urgent && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-semibold flex items-center gap-2">
            🔴 URGENT — Seller wants to sell quickly
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — images + details */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative w-full h-72 bg-gray-200 rounded-2xl overflow-hidden">
              {listing.images[0] ? (
                <Image
                  src={getPublicUrl(listing.images[0].url)}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">No image</div>
              )}
            </div>

            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {listing.images.slice(1).map((img) => (
                  <div key={img.id} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden">
                    <Image src={getPublicUrl(img.url)} alt={listing.title} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOwner ? (
                    <span className="text-xs text-gray-400">👁 {listing.viewCount} views</span>
                  ) : userId ? (
                    <SaveListingButton
                      listingId={listing.id}
                      initialSaved={initialSaved}
                      initialCount={initialSavedCount}
                      sellerUserId={listing.sellerProfile.user.id}
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-blue-600">{listing.currency} {price}</p>
                {!listing.negotiable && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">Fixed Price</span>
                )}
                {listing.negotiable && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Negotiable</span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>👁 {listing.viewCount} views</span>
                <span>♡ {listing.savedCount} watching</span>
                {listing.sellerType === "BUSINESS" && <span>🏢 Business seller</span>}
              </div>

              <div className="flex flex-wrap gap-2">
                {listing.condition && (
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${CONDITION_STYLES[listing.condition] ?? "bg-gray-100 text-gray-600"}`}>
                    {listing.condition}
                  </span>
                )}
                {listing.propertyType && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full capitalize">
                    {listing.propertyType.toLowerCase()}
                  </span>
                )}
                {listing.beds && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{listing.beds} beds</span>
                )}
                {listing.baths && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{listing.baths} baths</span>
                )}
                {listing.areaValue && listing.areaUnit && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {listing.areaValue} {listing.areaUnit}
                  </span>
                )}
                {listing.deliveryAvailable && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
                    🚚 Delivery available{listing.deliveryCost ? ` · ${listing.currency} ${Number(listing.deliveryCost).toLocaleString("en-PK")}` : " (free)"}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500">{listing.region.city} &mdash; {listing.region.name}</p>

              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
                <p className="text-sm text-gray-600 whitespace-pre-line">{listing.description}</p>
              </div>

              {/* Price history */}
              {listing.priceHistory.length > 0 && (
                <details className="border-t border-gray-100 pt-4">
                  <summary className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                    Price history ({listing.priceHistory.length} change{listing.priceHistory.length > 1 ? "s" : ""})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {listing.priceHistory.map((ph) => (
                      <li key={ph.id} className="text-xs text-gray-500">
                        {new Date(ph.changedAt).toLocaleDateString("en-PK")} — {listing.currency} {Number(ph.oldPrice).toLocaleString("en-PK")} → {listing.currency} {Number(ph.newPrice).toLocaleString("en-PK")}
                        {Number(ph.newPrice) < Number(ph.oldPrice) && (
                          <span className="ml-1 text-green-600">▼ {Math.round((1 - Number(ph.newPrice) / Number(ph.oldPrice)) * 100)}% off</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Report button */}
              {userId && !isOwner && (
                <div className="flex justify-end border-t border-gray-100 pt-3">
                  <ReportListingButton listingId={listing.id} />
                </div>
              )}
            </div>

            {/* Listing reviews */}
            {listing.reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                <h2 className="font-semibold text-gray-900">Listing Reviews</h2>
                {listing.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">{review.author.name ?? "User"}</span>
                      <span className="text-yellow-500 text-sm">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    </div>
                    {review.body && <p className="text-sm text-gray-600">{review.body}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Q&A section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <ListingQA
                listingId={listing.id}
                sellerUserId={listing.sellerProfile.user.id}
                initialQuestions={serializedQuestions}
              />
            </div>

            {/* Similar listings */}
            <SimilarListings
              category={listing.category}
              regionId={listing.regionId}
              excludeId={listing.id}
            />
          </div>

          {/* Right column — seller card + actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              {/* Seller header */}
              <div className="flex items-start gap-3">
                {listing.sellerProfile.user.image ? (
                  <Image
                    src={listing.sellerProfile.user.image}
                    alt={listing.sellerProfile.user.name ?? "Seller"}
                    width={40}
                    height={40}
                    className="rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm flex-shrink-0">
                    {(listing.sellerProfile.user.name ?? "S")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{listing.sellerProfile.user.name ?? "Seller"}</p>
                  {listing.sellerProfile.agentTier !== "NONE" && (
                    <span className="text-xs text-yellow-600 font-medium">{listing.sellerProfile.agentTier} Agent</span>
                  )}
                  {listing.sellerProfile.user.verificationStatus === "VERIFIED" && (
                    <span className="ml-1 text-xs text-blue-600">✓ Verified</span>
                  )}
                </div>
              </div>

              {/* Seller rating */}
              {listing.sellerProfile.sellerRatingCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-sm">{"★".repeat(Math.round(listing.sellerProfile.sellerRatingAvg))}{"☆".repeat(5 - Math.round(listing.sellerProfile.sellerRatingAvg))}</span>
                  <span className="text-xs text-gray-500">{listing.sellerProfile.sellerRatingAvg.toFixed(1)} ({listing.sellerProfile.sellerRatingCount} reviews)</span>
                </div>
              )}

              {/* Response rate */}
              {listing.sellerProfile.responseRate != null && (
                <p className="text-xs text-gray-500">Response rate: {Math.round(listing.sellerProfile.responseRate * 100)}%</p>
              )}

              {/* Badges */}
              {listing.sellerProfile.badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {listing.sellerProfile.badges.map((badge) => (
                    <span key={badge} className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_STYLES[badge] ?? "bg-gray-100 text-gray-600"}`}>
                      {badge.replace("_", " ")}
                    </span>
                  ))}
                </div>
              )}

              {listing.sellerProfile.bio && (
                <p className="text-xs text-gray-500 line-clamp-3">{listing.sellerProfile.bio}</p>
              )}

              {/* Storefront link */}
              <Link
                href={`/sellers/${listing.sellerProfile.id}`}
                className="text-xs text-blue-600 hover:underline block"
              >
                View all listings by this seller →
              </Link>

              <div className="border-t border-gray-100 pt-3 space-y-2">
                {listing.status === "ACTIVE" && userId && !isOwner && (
                  <>
                    {listing.negotiable && (
                      <OfferButton
                        listingId={listing.id}
                        sellerName={listing.sellerProfile.user.name ?? "Seller"}
                        currency={listing.currency}
                      />
                    )}
                    {!listing.negotiable && (
                      <p className="text-xs text-center text-gray-500">This listing has a fixed price.</p>
                    )}
                    <MessageSellerButton
                      listingId={listing.id}
                      sellerUserId={listing.sellerProfile.user.id}
                    />
                  </>
                )}

                {!userId && listing.status === "ACTIVE" && (
                  <a
                    href="/login"
                    className="block w-full text-center py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Sign in to make an offer
                  </a>
                )}

                <div className="flex justify-center pt-1">
                  <ShareButton url={`/m/${listing.id}`} title={listing.title} text={`${listing.currency} ${price} — ${listing.title}`} />
                </div>

                {listing.status === "ACTIVE" && (
                  <EscrowWidget
                    listingId={listing.id}
                    listingPrice={price}
                    currency={listing.currency}
                    sellerId={listing.sellerProfile.user.id}
                    currentUserId={userId}
                    existingEscrow={activeEscrowSerialized}
                  />
                )}

                {isOwner && (
                  <a
                    href={`/me/listings/${listing.id}/edit`}
                    className="block w-full text-center py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Edit listing
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// Lightweight client island — fires POST /api/listings/[id]/view on mount
function ViewTracker({ listingId }: { listingId: string }) {
  // Using a script tag approach to avoid adding a client boundary just for analytics
  // The actual view tracking is done via the API from the client
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){fetch('/api/listings/${listingId}/view',{method:'POST',credentials:'same-origin'}).catch(()=>{});})();`,
      }}
    />
  );
}
