"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface AdminShop {
  id: string;
  name: string;
  category: string;
  status: string;
  createdAt: string;
  owner: { id: string; name: string | null; email: string | null } | null;
  _count: { orders: number; products: number };
}

interface Props {
  shops: AdminShop[];
  total: number;
  page: number;
  pages: number;
}

const statusBadge: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_REVIEW: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

export default function AdminShopsTable({ shops, total, page, pages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banModal, setBanModal] = useState<{ shopId: string; name: string; reason: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ shopId: string; name: string } | null>(null);

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

  async function unban(shopId: string) {
    setLoading(shopId);
    setErrors((p) => ({ ...p, [shopId]: "" }));
    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban" }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setErrors((p) => ({ ...p, [shopId]: json.error ?? "Failed" }));
    } catch {
      setErrors((p) => ({ ...p, [shopId]: "Network error" }));
    } finally {
      setLoading(null);
    }
  }

  async function submitBan() {
    if (!banModal || !banModal.reason.trim()) return;
    setLoading(banModal.shopId);
    try {
      const res = await fetch(`/api/admin/shops/${banModal.shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban", reason: banModal.reason.trim() }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setBanModal(null);
        router.refresh();
      } else {
        setErrors((p) => ({ ...p, [banModal.shopId]: json.error ?? "Failed" }));
      }
    } catch {
      setErrors((p) => ({ ...p, [banModal.shopId]: "Network error" }));
    } finally {
      setLoading(null);
    }
  }

  async function submitDelete() {
    if (!deleteModal) return;
    setLoading(deleteModal.shopId);
    try {
      const res = await fetch(`/api/admin/shops/${deleteModal.shopId}`, { method: "DELETE" });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setDeleteModal(null);
        router.refresh();
      } else {
        setErrors((p) => ({ ...p, [deleteModal.shopId]: json.error ?? "Failed" }));
      }
    } catch {
      setErrors((p) => ({ ...p, [deleteModal.shopId]: "Network error" }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4 pb-16">
      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Ban {banModal.name}</h2>
              <button onClick={() => setBanModal(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <textarea
              value={banModal.reason}
              onChange={(e) => setBanModal((p) => p ? { ...p, reason: e.target.value } : null)}
              placeholder="Reason for ban (required)"
              rows={3}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBanModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitBan()}
                disabled={loading === banModal.shopId || !banModal.reason.trim()}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === banModal.shopId ? "Banning…" : "Ban Shop"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Delete {deleteModal.name}?</h2>
            <p className="text-sm text-gray-600">
              This permanently deletes the shop, its products, orders, and reviews. This cannot be undone.
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
                disabled={loading === deleteModal.shopId}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading === deleteModal.shopId ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="search"
          defaultValue={searchParams.get("search") ?? ""}
          placeholder="Search by name…"
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
          <option value="SUSPENDED">SUSPENDED (banned)</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{total} shop{total !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Products</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Orders</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shops.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">No shops found.</td>
              </tr>
            ) : (
              shops.map((shop) => {
                const isBanned = shop.status === "SUSPENDED";
                const isLoading = loading === shop.id;
                return (
                  <tr key={shop.id} className={`hover:bg-gray-50 transition-colors ${isBanned ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{shop.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {shop.owner ? (
                        <Link href={`/admin/users?search=${encodeURIComponent(shop.owner.email ?? shop.owner.name ?? "")}`} className="hover:underline">
                          {shop.owner.name ?? shop.owner.email ?? shop.owner.id.slice(-6)}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{shop.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge[shop.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {shop.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{shop._count.products}</td>
                    <td className="px-4 py-3 text-gray-600">{shop._count.orders}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(shop.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/shops/manage/${shop.id}`}
                          target="_blank"
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 transition-colors"
                        >
                          Manage
                        </Link>
                        {isBanned ? (
                          <button
                            type="button"
                            onClick={() => void unban(shop.id)}
                            disabled={isLoading}
                            className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {isLoading ? "…" : "Unban"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBanModal({ shopId: shop.id, name: shop.name, reason: "" })}
                            disabled={isLoading}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteModal({ shopId: shop.id, name: shop.name })}
                          disabled={isLoading}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                          Delete
                        </button>
                        {errors[shop.id] && <span className="text-xs text-red-500">{errors[shop.id]}</span>}
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
