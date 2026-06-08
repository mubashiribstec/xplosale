import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  EXPIRED: "bg-orange-100 text-orange-600",
  SOLD: "bg-blue-100 text-blue-600",
};

export default async function SavedListingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const savedListings = await prisma.savedListing.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    take: 50,
    include: {
      listing: {
        include: {
          images: { take: 1, orderBy: { order: "asc" } },
          region: { select: { name: true, city: true } },
        },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        <div>
          <Link href="/me" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Saved Listings
            {savedListings.length > 0 && (
              <span className="ml-2 text-base font-normal text-gray-400">({savedListings.length})</span>
            )}
          </h1>
        </div>

        {savedListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
            <p className="text-gray-500">You haven&apos;t saved any listings yet.</p>
            <Link
              href="/marketplace"
              className="inline-block text-blue-600 hover:underline text-sm font-medium"
            >
              Browse marketplace →
            </Link>
          </div>
        ) : (
          <>
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}
            >
              {savedListings.map(({ id: savedId, listing, savedAt }) => {
                const img = listing.images[0];
                const price = Number(listing.price).toLocaleString("en-PK");
                const statusClass = STATUS_COLORS[listing.status] ?? "bg-gray-100 text-gray-600";
                return (
                  <Link
                    key={savedId}
                    href={`/m/${listing.id}`}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group block"
                  >
                    <div className="relative w-full h-40 bg-gray-100">
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
                      <span
                        className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}`}
                      >
                        {listing.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="p-4 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                        {listing.title}
                      </p>
                      <p className="text-sm font-bold text-blue-600">{listing.currency} {price}</p>
                      <p className="text-xs text-gray-400">
                        {listing.region.city}, {listing.region.name}
                      </p>
                      <p className="text-xs text-gray-300 pt-1">
                        Saved {new Date(savedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <p className="text-xs text-center text-gray-400">
              To remove a listing from your saves, visit the listing and click the heart icon.
            </p>
          </>
        )}

      </div>
    </main>
  );
}
