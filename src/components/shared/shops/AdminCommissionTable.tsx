"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CommissionShop {
  id: string;
  name: string;
  rate: number;          // effective rate (custom or platform default)
  customRate: number | null;
  balance: number;
  owner: { id: string; name: string | null; email: string | null } | null;
}

interface Props {
  shops: CommissionShop[];
  defaultRate: number;
}

const fmt = (n: number) => `PKR ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function AdminCommissionTable({ shops, defaultRate }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [rates, setRates] = useState<Record<string, string>>(
    () => Object.fromEntries(shops.map((s) => [s.id, String(s.customRate ?? s.rate)])),
  );
  const [settleModal, setSettleModal] = useState<{ shopId: string; name: string; balance: number; note: string } | null>(null);

  async function post(shopId: string, body: Record<string, unknown>) {
    setLoading(shopId);
    setErrors((p) => ({ ...p, [shopId]: "" }));
    try {
      const res = await fetch(`/api/admin/shops/${shopId}/commission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) { router.refresh(); return true; }
      setErrors((p) => ({ ...p, [shopId]: json.error ?? "Failed" }));
      return false;
    } catch {
      setErrors((p) => ({ ...p, [shopId]: "Network error" }));
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function saveRate(shopId: string) {
    const rate = parseFloat(rates[shopId] ?? "");
    if (Number.isNaN(rate) || rate < 0 || rate > 100) {
      setErrors((p) => ({ ...p, [shopId]: "Rate must be 0–100" }));
      return;
    }
    await post(shopId, { action: "set-rate", rate });
  }

  async function submitSettle() {
    if (!settleModal) return;
    const okDone = await post(settleModal.shopId, { action: "settle", note: settleModal.note.trim() || undefined });
    if (okDone) setSettleModal(null);
  }

  return (
    <div className="space-y-4 pb-16">
      {settleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">Settle {settleModal.name}</h2>
            <p className="text-sm text-gray-600">
              Mark <strong>{fmt(settleModal.balance)}</strong> as paid. This records a settlement and resets the balance to zero.
            </p>
            <textarea
              value={settleModal.note}
              onChange={(e) => setSettleModal((p) => p ? { ...p, note: e.target.value } : null)}
              placeholder="Note (optional) — e.g. paid via bank transfer ref #1234"
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettleModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitSettle()}
                disabled={loading === settleModal.shopId}
                className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading === settleModal.shopId ? "Settling…" : "Mark Settled"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500">
        {shops.length} commission shop{shops.length !== 1 ? "s" : ""} · platform default rate {defaultRate}%
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Shop</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Owner</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rate %</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Owed</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shops.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No commission shops yet.</td>
              </tr>
            ) : (
              shops.map((shop) => {
                const isLoading = loading === shop.id;
                return (
                  <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/shops/manage/${shop.id}`} target="_blank" className="hover:underline">{shop.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {shop.owner ? (
                        <Link href={`/admin/users?search=${encodeURIComponent(shop.owner.email ?? shop.owner.name ?? "")}`} className="hover:underline">
                          {shop.owner.name ?? shop.owner.email ?? shop.owner.id.slice(-6)}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={rates[shop.id] ?? ""}
                          onChange={(e) => setRates((p) => ({ ...p, [shop.id]: e.target.value }))}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => void saveRate(shop.id)}
                          disabled={isLoading}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded hover:bg-blue-200 disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${shop.balance > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(shop.balance)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSettleModal({ shopId: shop.id, name: shop.name, balance: shop.balance, note: "" })}
                          disabled={isLoading || shop.balance <= 0}
                          className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-40"
                        >
                          Settle
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
    </div>
  );
}
