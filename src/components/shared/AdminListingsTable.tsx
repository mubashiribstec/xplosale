"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface AdminListing {
  id: string;
  title: string;
  category: string;
  price: string;
  currency: string;
  status: string;
  createdAt: string;
  sellerProfile: { user: { id: string; name: string | null; email: string | null } } | null;
}

interface Props {
  listings: AdminListing[];
  total: number;
  page: number;
  pages: number;
}

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  SOLD: "bg-blue-100 text-blue-700",
};

export default function AdminListingsTable({ listings, total, page, pages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteModal, setDeleteModal] = useState<{ listingId: string; title: string } | null>(null);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "all");
      if (value) params.set(key, value); else params.delete(key);
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  async function submitDelete() {
    if (!deleteModal) return;
    setLoading(deleteModal.listingId);
    try {
      const res = await fetch(`/api/admin/listings/${deleteModal.listingId}`, { method: "DELETE" });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setDeleteModal(null);
        router.refresh();
      } else {
        setErrors((p) => ({ ...p, [deleteModal.listingId]: json.error ?? "Failed" }));
      }
    } catch {
      setErrors((p) => ({ ...p, [deleteModal.listingId]: "Network error" }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 pb-16">
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Delete &quot;{deleteModal.title}&quot;?</h2>
            <p className="text-sm text-gray-600">
              This permanently deletes the listing, its images, reviews, and saved-listing references. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitDelete()}
                disabled={loading === deleteModal.listingId}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === deleteModal.listingId ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          defaultValue={searchParams.get("search") ?? ""}
          placeholder="Search by title…"
          onChange={(e) => updateParam("search", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60"
        />
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PENDING_REVIEW">PENDING_REVIEW</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="REJECTED">REJECTED</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="SOLD">SOLD</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total} listing{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Seller</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Price</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No listings found.</td>
              </tr>
            ) : (
              listings.map((listing) => {
                const isLoading = loading === listing.id;
                const seller = listing.sellerProfile?.user;
                return (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                      <span className="line-clamp-1">{listing.title}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {seller ? (
                        <Link href={`/admin/users?search=${encodeURIComponent(seller.email ?? seller.name ?? "")}`} className="hover:underline">
                          {seller.name ?? seller.email ?? seller.id.slice(-6)}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{listing.category}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {listing.currency} {Number(listing.price).toLocaleString("en-PK")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge[listing.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(listing.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/m/${listing.id}`}
                          target="_blank"
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteModal({ listingId: listing.id, title: listing.title })}
                          disabled={isLoading}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                        {errors[listing.id] && <span className="text-xs text-red-500">{errors[listing.id]}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?${new URLSearchParams({ ...Object.fromEntries(searchParams.entries()), tab: "all", page: String(p) }).toString()}`}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                p === page ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
