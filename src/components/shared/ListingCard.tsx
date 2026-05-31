import Image from "next/image";
import Link from "next/link";
import { getPublicUrl } from "@/core/adapters/storage";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    price: number | string;
    currency: string;
    propertyType?: string | null;
    areaValue?: number | null;
    areaUnit?: string | null;
    beds?: number | null;
    baths?: number | null;
    region: { name: string; city: string };
    images: { url: string; width: number; height: number }[];
    sellerProfile?: { agentTier: string } | null;
  };
}

export default function ListingCard({ listing }: ListingCardProps) {
  const firstImage = listing.images[0];
  const price = Number(listing.price).toLocaleString("en-PK");

  return (
    <Link href={`/m/${listing.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="relative w-full h-48 bg-gray-100">
          {firstImage ? (
            <Image
              src={getPublicUrl(firstImage.url)}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No image</div>
          )}
          {listing.sellerProfile?.agentTier === "PRO" && (
            <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full">
              PRO
            </span>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug group-hover:text-blue-600 transition-colors">
            {listing.title}
          </h3>

          <p className="text-lg font-bold text-blue-600">
            {listing.currency} {price}
          </p>

          <p className="text-xs text-gray-500">
            {listing.region.city} &mdash; {listing.region.name}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {listing.beds && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {listing.beds} bed{listing.beds !== 1 ? "s" : ""}
              </span>
            )}
            {listing.baths && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {listing.baths} bath{listing.baths !== 1 ? "s" : ""}
              </span>
            )}
            {listing.areaValue && listing.areaUnit && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {listing.areaValue} {listing.areaUnit}
              </span>
            )}
            {listing.propertyType && (
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">
                {listing.propertyType.toLowerCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
