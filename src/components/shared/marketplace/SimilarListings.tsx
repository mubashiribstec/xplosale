"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ListingImage {
  url: string;
}

interface SimilarListing {
  id: string;
  title: string;
  price: number;
  images: ListingImage[];
}

interface ApiResponse {
  ok: boolean;
  data?: { listings?: SimilarListing[] };
}

interface SimilarListingsProps {
  category: string;
  regionId: string;
  excludeId: string;
}

function formatPKR(amount: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SimilarListings({ category, regionId, excludeId }: SimilarListingsProps) {
  const [listings, setListings] = useState<SimilarListing[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({
      category,
      regionId,
      limit: "4",
      status: "ACTIVE",
    });

    fetch(`/api/listings?${params.toString()}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<ApiResponse>;
      })
      .then((json) => {
        if (!json?.ok) return;
        const all = json.data?.listings ?? [];
        const filtered = all.filter((l) => l.id !== excludeId);
        setListings(filtered);
      })
      .catch(() => {
        // Silently fail — nothing to show
      });
  }, [category, regionId, excludeId]);

  if (listings.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-[var(--display)]">Similar listings</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {listings.map((listing) => {
          const firstImage = listing.images[0]?.url;
          return (
            <Link
              key={listing.id}
              href={`/m/${listing.id}`}
              className="w-44 flex-shrink-0 rounded-xl border border-[var(--line)] overflow-hidden hover:shadow-md transition-shadow block"
            >
              <div className="h-28 bg-[var(--clay)] overflow-hidden">
                {firstImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firstImage}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">
                    🏷️
                  </div>
                )}
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium text-[var(--ink)] line-clamp-2 leading-snug">
                  {listing.title}
                </p>
                <p className="text-xs font-semibold text-[var(--display)]">
                  {formatPKR(listing.price)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
