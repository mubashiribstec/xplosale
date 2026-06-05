"use client";

import { useState } from "react";

interface ShopItem {
  id: string;
  name: string;
  category: string;
  type: string;
  description: string;
  addressLine: string;
  createdAt: string;
  region: { name: string; city: string; country: string };
  images: { id: string; url: string; kind: string }[];
  owner: { name: string | null; email: string | null } | null;
}

interface Props {
  initialShops: ShopItem[];
}

export default function ShopReviewQueue({ initialShops }: Props) {
  const [shops, setShops] = useState<ShopItem[]>(initialShops);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(shopId: string, action: "approve" | "reject") {
    if (action === "reject" && !reason.trim()) return;
    setLoading(shopId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "approve" ? { action } : { action, reason: reason.trim() }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Action failed");
        return;
      }
      setShops((prev) => prev.filter((s) => s.id !== shopId));
      setExpanded(null);
      setRejectingId(null);
      setReason("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  if (shops.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
        <p className="text-gray-500 text-sm">No shops pending review. 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {shops.map((shop) => {
        const board = shop.images.find((i) => i.kind === "STOREFRONT_BOARD");
        const isExpanded = expanded === shop.id;
        const isRejecting = rejectingId === shop.id;
        const isLoading = loading === shop.id;

        return (
          <div key={shop.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(isExpanded ? null : shop.id)}
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl">
                {board ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={board.url} alt={shop.name} className="w-full h-full object-cover" />
                ) : "🏪"}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{shop.name}</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                    Pending Review
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {shop.category} · {shop.type} · {shop.region.name}, {shop.region.city}
                </p>
                {shop.owner && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Owner: {shop.owner.name ?? shop.owner.email ?? "Unknown"}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                {/* Storefront photo */}
                {board && (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={board.url} alt="Storefront" className="rounded-lg h-48 w-full object-cover" />
                  </div>
                )}
                {/* Description + address */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{shop.description}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Address</p>
                  <p className="text-sm text-gray-700">{shop.addressLine}, {shop.region.name}, {shop.region.city}, {shop.region.country}</p>
                </div>
                <p className="text-xs text-gray-400">
                  Submitted {new Date(shop.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                {/* Actions */}
                {isRejecting ? (
                  <div className="space-y-3">
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for rejection (required)"
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleAction(shop.id, "reject")}
                        disabled={isLoading || !reason.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        {isLoading ? "Rejecting…" : "Confirm Reject"}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setReason(""); }}
                        className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleAction(shop.id, "approve")}
                      disabled={isLoading}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {isLoading ? "Approving…" : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => setRejectingId(shop.id)}
                      disabled={isLoading}
                      className="px-5 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
