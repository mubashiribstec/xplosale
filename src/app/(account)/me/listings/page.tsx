import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  EXPIRED: "bg-orange-100 text-orange-600",
  SOLD: "bg-blue-100 text-blue-600",
};

export default async function MyListingsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const userId = getUserId(session);

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: {
      listings: {
        orderBy: { createdAt: "desc" },
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
      },
    },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/me" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">My Listings</h1>
          </div>
          {sellerProfile ? (
            <Link
              href="/me/listings/new"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New listing
            </Link>
          ) : null}
        </div>

        {!sellerProfile ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <p className="text-gray-600">You need a seller profile to create listings.</p>
            <Link
              href="/me/seller"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Set up seller profile
            </Link>
          </div>
        ) : sellerProfile.listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p>No listings yet.</p>
            <Link href="/me/listings/new" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              Create your first listing
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sellerProfile.listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                      <span className="line-clamp-1">{listing.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[listing.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {listing.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {listing.currency} {Number(listing.price).toLocaleString("en-PK")}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(listing.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/m/${listing.id}`}
                          className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/me/listings/${listing.id}/edit`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
