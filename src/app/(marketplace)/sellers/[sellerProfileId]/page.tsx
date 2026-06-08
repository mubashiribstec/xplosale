import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";

interface PageProps {
  params: Promise<{ sellerProfileId: string }>;
}

export async function generateMetadata(
  { params }: { params: Promise<{ sellerProfileId: string }> }
): Promise<Metadata> {
  const { sellerProfileId } = await params;
  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    select: { user: { select: { name: true } }, sellerRatingAvg: true, sellerRatingCount: true },
  });
  if (!profile) return { title: "Seller not found" };
  return {
    title: `${profile.user.name ?? "Seller"} — Xplosale Marketplace`,
    description: `${profile.sellerRatingCount} reviews · ${profile.sellerRatingAvg.toFixed(1)} stars`,
  };
}

const BADGE_STYLES: Record<string, { label: string; className: string }> = {
  TRUSTED: { label: "Trusted", className: "bg-blue-100 text-blue-700 border-blue-200" },
  TOP_RATED: { label: "Top Rated", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  QUICK_RESPONDER: { label: "Quick Responder", className: "bg-green-100 text-green-700 border-green-200" },
};

function StarBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="w-4 text-right">{rating}</span>
      <span className="text-yellow-500">★</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-left">{count}</span>
    </div>
  );
}

export default async function SellerProfilePage({ params }: PageProps) {
  const { sellerProfileId } = await params;

  const profile = await prisma.sellerProfile.findUnique({
    where: { id: sellerProfileId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          verificationStatus: true,
          isPartner: true,
          createdAt: true,
        },
      },
      listings: {
        where: { status: "ACTIVE" },
        take: 12,
        orderBy: { createdAt: "desc" },
        include: {
          images: { take: 1, orderBy: { order: "asc" } },
          region: { select: { name: true, city: true } },
        },
      },
      sellerReviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  if (!profile) notFound();

  const { user, listings, sellerReviews } = profile;

  // Compute star distribution from fetched reviews
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of sellerReviews) dist[r.rating] = (dist[r.rating] ?? 0) + 1;

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });

  const initials = (user.name ?? "S")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="flex-shrink-0">
            {user.image ? (
              <div className="relative w-20 h-20 rounded-full overflow-hidden">
                <Image
                  src={getPublicUrl(user.image)}
                  alt={user.name ?? "Seller"}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{user.name ?? "Seller"}</h1>
              {user.verificationStatus === "VERIFIED" && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Verified
                </span>
              )}
              {user.isPartner && (
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                  Partner
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Member since {memberSince}</p>

            {/* Badges row */}
            {profile.badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {profile.badges.map((badge) => {
                  const def = BADGE_STYLES[badge] ?? { label: badge, className: "bg-gray-100 text-gray-600 border-gray-200" };
                  return (
                    <span
                      key={badge}
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${def.className}`}
                    >
                      {def.label}
                    </span>
                  );
                })}
              </div>
            )}

            {profile.responseRate != null && (
              <p className="text-xs text-gray-500 mt-2">
                Response rate: <span className="font-semibold text-gray-700">{Math.round(profile.responseRate)}%</span>
              </p>
            )}
          </div>
        </div>

        {/* ── Rating bar ── */}
        {profile.sellerRatingCount > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start gap-6">
              <div className="text-center flex-shrink-0">
                <p className="text-5xl font-bold text-gray-900">{profile.sellerRatingAvg.toFixed(1)}</p>
                <p className="text-yellow-500 text-xl mt-1">
                  {"★".repeat(Math.round(profile.sellerRatingAvg))}
                  {"☆".repeat(5 - Math.round(profile.sellerRatingAvg))}
                </p>
                <p className="text-xs text-gray-500 mt-1">{profile.sellerRatingCount} review{profile.sellerRatingCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => (
                  <StarBar
                    key={star}
                    rating={star}
                    count={dist[star] ?? 0}
                    total={sellerReviews.length}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Active Listings grid ── */}
        {listings.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Active Listings <span className="text-sm font-normal text-gray-400">({listings.length})</span>
            </h2>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
            >
              {listings.map((listing) => {
                const img = listing.images[0];
                const price = Number(listing.price).toLocaleString("en-PK");
                return (
                  <Link
                    key={listing.id}
                    href={`/m/${listing.id}`}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group"
                  >
                    <div className="relative w-full h-36 bg-gray-100">
                      {img ? (
                        <Image
                          src={getPublicUrl(img.url)}
                          alt={listing.title}
                          fill
                          className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-sm">No image</div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{listing.title}</p>
                      <p className="text-sm font-bold text-blue-600">{listing.currency} {price}</p>
                      <p className="text-xs text-gray-400">{listing.region.city}, {listing.region.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {listings.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p>No active listings at the moment.</p>
          </div>
        )}

        {/* ── Reviews list ── */}
        {sellerReviews.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Reviews</h2>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {sellerReviews.map((review) => {
                const authorInitials = (review.author.name ?? "U")
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <div key={review.id} className="p-5 space-y-2">
                    <div className="flex items-center gap-3">
                      {review.author.image ? (
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          <Image
                            src={getPublicUrl(review.author.image)}
                            alt={review.author.name ?? "User"}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold flex-shrink-0">
                          {authorInitials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-800">{review.author.name ?? "User"}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <span className="text-yellow-500 text-sm">
                          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                        </span>
                      </div>
                    </div>
                    {review.body && (
                      <p className="text-sm text-gray-600 pl-11">{review.body}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
