"use client";

import { useState } from "react";

interface Plan {
  key: string;
  name: string;
  maxShops: number;
  maxProducts: number;
  maxImagesPerProduct: number;
  priceMonthly: number;
  featuredPlacement: boolean;
  analytics: boolean;
  customBanner: boolean;
}

export default function AdminPlanEditor({ plan }: { plan: Plan }) {
  const [maxShops, setMaxShops] = useState(String(plan.maxShops));
  const [maxProducts, setMaxProducts] = useState(String(plan.maxProducts));
  const [maxImages, setMaxImages] = useState(String(plan.maxImagesPerProduct));
  const [priceMonthly, setPriceMonthly] = useState(String(plan.priceMonthly));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/plans/${plan.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxShops: parseInt(maxShops, 10),
          maxProducts: parseInt(maxProducts, 10),
          maxImagesPerProduct: parseInt(maxImages, 10),
          priceMonthly: parseFloat(priceMonthly),
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const isPremium = plan.key === "PREMIUM";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-semibold text-gray-900 text-base">{plan.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{plan.key}</p>
        </div>
        {isPremium && (
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-semibold">Premium</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">Max Shops</span>
          <input
            type="number" min="1" max="100" value={maxShops}
            onChange={(e) => setMaxShops(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">Max Products</span>
          <input
            type="number" min="1" max="500" value={maxProducts}
            onChange={(e) => setMaxProducts(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">Max Images / Product</span>
          <input
            type="number" min="1" max="20" value={maxImages}
            onChange={(e) => setMaxImages(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-600">Price / Month (PKR)</span>
          <input
            type="number" min="0" step="any" value={priceMonthly}
            onChange={(e) => setPriceMonthly(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}
