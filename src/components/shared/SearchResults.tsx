'use client';

import Link from "next/link";
import Image from "next/image";
import { getPublicUrl } from "@/lib/public-url";

interface ListingResult {
  id: string;
  title: string;
  price: string;
  currency: string;
  region: { name: string; city: string };
  imageKey: string | null;
  propertyType: string | null;
  type: 'listing';
}

interface JobResult {
  id: string;
  title: string;
  company: { id: string; name: string; verifiedEmployer: boolean };
  region: { name: string; city: string };
  remoteType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  type: 'job';
}

interface ProfileResult {
  id: string;
  handle: string;
  headline: string | null;
  profilePhotoUrl: string | null;
  name: string | null;
  location: string | null;
  type: 'profile';
}

interface SearchResultsProps {
  q: string;
  listings: ListingResult[];
  jobs: JobResult[];
  profiles: ProfileResult[];
}

function formatPrice(price: string, currency: string): string {
  const num = parseFloat(price);
  return `${currency} ${num.toLocaleString("en-PK")}`;
}

export default function SearchResults({ q, listings, jobs, profiles }: SearchResultsProps) {
  const isEmpty = listings.length === 0 && jobs.length === 0 && profiles.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-semibold text-gray-700">No results for &ldquo;{q}&rdquo;</p>
        <p className="text-gray-400 mt-2">Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {listings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Properties ({listings.length})</h2>
            <Link href="/m" className="text-sm text-blue-600 hover:underline">
              View all listings →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/m/${listing.id}`}
                className="group block bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
              >
                <div className="relative w-full h-40 bg-gray-100">
                  {listing.imageKey ? (
                    <Image
                      src={getPublicUrl(listing.imageKey)}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1.5">
                  <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm group-hover:text-blue-600 transition-colors">
                    {listing.title}
                  </h3>
                  <p className="text-base font-bold text-blue-600">
                    {formatPrice(listing.price, listing.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {listing.region.city} &mdash; {listing.region.name}
                  </p>
                  {listing.propertyType && (
                    <span className="inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full capitalize">
                      {listing.propertyType.toLowerCase()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {jobs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Jobs ({jobs.length})</h2>
            <Link href={`/jobs?keyword=${encodeURIComponent(q)}`} className="text-sm text-blue-600 hover:underline">
              View all jobs →
            </Link>
          </div>
          <div className="space-y-3">
            {jobs.map((job) => {
              const salary =
                job.salaryMin || job.salaryMax
                  ? `${job.currency} ${job.salaryMin?.toLocaleString("en-PK") ?? "?"} – ${job.salaryMax?.toLocaleString("en-PK") ?? "?"}`
                  : "Not disclosed";

              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="group flex items-start justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span>{job.company.name}</span>
                      {job.company.verifiedEmployer && (
                        <span className="text-blue-500" title="Verified employer">✓</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {job.region.city || job.region.name}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-700 shrink-0 ml-4">{salary}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {profiles.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">People ({profiles.length})</h2>
            <Link href="/n/people" className="text-sm text-blue-600 hover:underline">
              View all people →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => {
              const photoUrl = profile.profilePhotoUrl ? getPublicUrl(profile.profilePhotoUrl) : null;
              return (
                <Link
                  key={profile.id}
                  href={`/n/${profile.handle}`}
                  className="group flex items-start gap-3 bg-white rounded-xl border border-gray-200 px-4 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={profile.name ?? profile.handle}
                      className="w-11 h-11 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-base shrink-0">
                      {(profile.name ?? profile.handle)[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {profile.name ?? profile.handle}
                    </p>
                    <p className="text-xs text-gray-500 truncate">@{profile.handle}</p>
                    {profile.headline && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{profile.headline}</p>
                    )}
                    {profile.location && (
                      <p className="text-xs text-gray-400 truncate">{profile.location}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
