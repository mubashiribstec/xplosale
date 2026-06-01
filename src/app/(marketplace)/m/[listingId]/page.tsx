import { notFound } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import OfferButton from "@/components/shared/OfferButton";

interface PageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { listingId } = await params;
  const session = await getSession();

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      images: { orderBy: { order: "asc" } },
      region: { select: { id: true, name: true, slug: true, city: true } },
      sellerProfile: {
        select: {
          id: true,
          agentTier: true,
          bio: true,
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

  if (!listing) notFound();

  const userId = session ? (session.user as { id: string }).id : null;
  const isOwner = userId && listing.sellerProfile.user.id === userId;
  const isAdmin = session && (session.user as { role: string }).role === "ADMIN";

  if (listing.status !== "ACTIVE" && !isOwner && !isAdmin) {
    notFound();
  }

  const price = Number(listing.price).toLocaleString("en-PK");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {listing.status !== "ACTIVE" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
            This listing is <strong>{listing.status.toLowerCase().replace("_", " ")}</strong> and only visible to you.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <Image
                      src={getPublicUrl(img.url)}
                      alt={listing.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
              <p className="text-3xl font-bold text-blue-600">{listing.currency} {price}</p>

              <div className="flex flex-wrap gap-2">
                {listing.propertyType && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full capitalize">
                    {listing.propertyType.toLowerCase()}
                  </span>
                )}
                {listing.beds && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {listing.beds} beds
                  </span>
                )}
                {listing.baths && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {listing.baths} baths
                  </span>
                )}
                {listing.areaValue && listing.areaUnit && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                    {listing.areaValue} {listing.areaUnit}
                  </span>
                )}
              </div>

              <p className="text-sm text-gray-500">
                {listing.region.city} &mdash; {listing.region.name}
              </p>

              <div className="border-t border-gray-100 pt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Description</h2>
                <p className="text-sm text-gray-600 whitespace-pre-line">{listing.description}</p>
              </div>
            </div>

            {listing.reviews.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
                <h2 className="font-semibold text-gray-900">Reviews</h2>
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
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                  {(listing.sellerProfile.user.name ?? "S")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{listing.sellerProfile.user.name ?? "Seller"}</p>
                  {listing.sellerProfile.agentTier !== "NONE" && (
                    <span className="text-xs text-yellow-600 font-medium">{listing.sellerProfile.agentTier} Agent</span>
                  )}
                </div>
              </div>
              {listing.sellerProfile.bio && (
                <p className="text-xs text-gray-500 line-clamp-3">{listing.sellerProfile.bio}</p>
              )}

              {listing.status === "ACTIVE" && userId && !isOwner && (
                <OfferButton
                  listingId={listing.id}
                  sellerName={listing.sellerProfile.user.name ?? "Seller"}
                  currency={listing.currency}
                />
              )}

              {!userId && listing.status === "ACTIVE" && (
                <a
                  href="/login"
                  className="block w-full text-center py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Sign in to make an offer
                </a>
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
    </main>
  );
}
