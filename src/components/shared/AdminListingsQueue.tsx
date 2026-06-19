"use client";

import { useState } from "react";

interface Seller {
  id: string;
  agentTier: string;
  user: { id: string; name: string | null };
}

interface ListingWithSeller {
  id: string;
  title: string;
  price: number | string;
  currency: string;
  status: string;
  createdAt: string;
  region: { name: string; city: string };
  sellerProfile: Seller;
}

interface AdminListingsQueueProps {
  listings: ListingWithSeller[];
}

export default function AdminListingsQueue({ listings: initial }: AdminListingsQueueProps) {
  const [listings, setListings] = useState(initial);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkReject, setBulkReject] = useState(false);

  async function approve(id: string) {
    setLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/listings/${id}/approve`, { method: "POST" });
    const json = await res.json() as { ok: boolean; error?: string };
    setLoading(null);
    if (json.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
    } else {
      setError(json.error ?? "Failed");
    }
  }

  async function reject(id: string) {
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Reason must be at least 5 characters");
      return;
    }
    setLoading(id);
    setError(null);
    const res = await fetch(`/api/admin/listings/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json() as { ok: boolean; error?: string };
    setLoading(null);
    if (json.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id));
      setRejectId(null);
      setReason("");
    } else {
      setError(json.error ?? "Failed");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === listings.length ? new Set() : new Set(listings.map((l) => l.id))
    );
  }

  async function bulkApprove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkLoading(true);
    setError(null);
    const res = await fetch("/api/admin/listings/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action: "approve" }),
    });
    const json = await res.json() as { ok: boolean; error?: string };
    setBulkLoading(false);
    if (json.ok) {
      setListings((prev) => prev.filter((l) => !selected.has(l.id)));
      setSelected(new Set());
    } else {
      setError(json.error ?? "Failed");
    }
  }

  async function bulkRejectSubmit() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Reason must be at least 5 characters");
      return;
    }
    setBulkLoading(true);
    setError(null);
    const res = await fetch("/api/admin/listings/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action: "reject", reason }),
    });
    const json = await res.json() as { ok: boolean; error?: string };
    setBulkLoading(false);
    if (json.ok) {
      setListings((prev) => prev.filter((l) => !selected.has(l.id)));
      setSelected(new Set());
      setBulkReject(false);
      setReason("");
    } else {
      setError(json.error ?? "Failed");
    }
  }

  if (listings.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No listings pending review.</p>;
  }

  return (
    <div className="space-y-3 pb-16">
      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-2 font-medium w-8">
                <input
                  type="checkbox"
                  checked={selected.size > 0 && selected.size === listings.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all listings"
                />
              </th>
              <th className="pb-2 pr-4 font-medium">Title</th>
              <th className="pb-2 pr-4 font-medium">Seller</th>
              <th className="pb-2 pr-4 font-medium">Region</th>
              <th className="pb-2 pr-4 font-medium">Price</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {listings.map((listing) => (
              <tr key={listing.id} className="py-2">
                <td className="py-3 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.has(listing.id)}
                    onChange={() => toggleSelect(listing.id)}
                    aria-label={`Select ${listing.title}`}
                  />
                </td>
                <td className="py-3 pr-4 font-medium text-gray-900 max-w-xs">
                  <span className="line-clamp-1">{listing.title}</span>
                </td>
                <td className="py-3 pr-4 text-gray-600">
                  {listing.sellerProfile.user.name ?? "—"}
                </td>
                <td className="py-3 pr-4 text-gray-600">
                  {listing.region.city}, {listing.region.name}
                </td>
                <td className="py-3 pr-4 text-gray-900 font-medium">
                  {listing.currency ?? "PKR"} {Number(listing.price).toLocaleString("en-PK")}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => approve(listing.id)}
                      disabled={loading === listing.id}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectId(listing.id); setReason(""); setError(null); }}
                      disabled={loading === listing.id}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(rejectId || bulkReject) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {bulkReject ? `Reject ${selected.size} listing${selected.size !== 1 ? "s" : ""}` : "Reject listing"}
            </h2>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Reason for rejection (min 5 characters)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setRejectId(null); setBulkReject(false); setReason(""); setError(null); }}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { if (bulkReject) void bulkRejectSubmit(); else if (rejectId) void reject(rejectId); }}
                disabled={bulkReject ? bulkLoading : loading === rejectId}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {(bulkReject ? bulkLoading : loading === rejectId) ? "Rejecting…" : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button
            type="button"
            onClick={() => void bulkApprove()}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {bulkLoading ? "Working…" : "Approve Selected"}
          </button>
          <button
            type="button"
            onClick={() => { setBulkReject(true); setReason(""); setError(null); }}
            disabled={bulkLoading}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Reject Selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={bulkLoading}
            className="px-3 py-1.5 border border-gray-600 text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
