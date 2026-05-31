"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Region {
  id: string;
  name: string;
  slug: string;
  city: string;
}

const PROPERTY_TYPES = ["HOUSE", "APARTMENT", "PLOT", "COMMERCIAL", "OTHER"] as const;
const AREA_UNITS = ["Marla", "Kanal", "sqft", "sqyd", "acre"];

export default function NewListingPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "real_estate",
    regionId: "",
    propertyType: "",
    beds: "",
    baths: "",
    areaValue: "",
    areaUnit: "Marla",
    lat: "",
    lng: "",
  });

  useEffect(() => {
    fetch("/api/regions")
      .then((r) => r.json())
      .then(({ data }) => { if (data) setRegions(data as Region[]); });
  }, []);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      category: form.category,
      regionId: form.regionId,
    };
    if (form.propertyType) body.propertyType = form.propertyType;
    if (form.beds) body.beds = parseInt(form.beds, 10);
    if (form.baths) body.baths = parseInt(form.baths, 10);
    if (form.areaValue) body.areaValue = parseFloat(form.areaValue);
    if (form.areaValue && form.areaUnit) body.areaUnit = form.areaUnit;
    if (form.lat) body.lat = parseFloat(form.lat);
    if (form.lng) body.lng = parseFloat(form.lng);

    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { ok: boolean; data?: { id: string }; error?: string };
    setLoading(false);

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Failed to create listing");
      return;
    }

    router.push(`/me/listings/${json.data!.id}/edit`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button type="button" onClick={() => router.push("/me/listings")} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">New Listing</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Basic Info</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                minLength={5}
                maxLength={200}
                placeholder="e.g. 5 Marla House in DHA Phase 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
                minLength={20}
                maxLength={5000}
                rows={5}
                placeholder="Describe your property in detail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (PKR)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                required
                min={1}
                placeholder="e.g. 15000000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Location</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                value={form.regionId}
                onChange={(e) => set("regionId", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.city ? `${r.city} — ` : ""}{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => set("lat", e.target.value)}
                  placeholder="e.g. 31.5204"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => set("lng", e.target.value)}
                  placeholder="e.g. 74.3587"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Property Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select
                value={form.propertyType}
                onChange={(e) => set("propertyType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{pt.charAt(0) + pt.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  value={form.beds}
                  onChange={(e) => set("beds", e.target.value)}
                  min={1}
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  value={form.baths}
                  onChange={(e) => set("baths", e.target.value)}
                  min={1}
                  placeholder="e.g. 2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area size</label>
                <input
                  type="number"
                  value={form.areaValue}
                  onChange={(e) => set("areaValue", e.target.value)}
                  min={0}
                  step="any"
                  placeholder="e.g. 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area unit</label>
                <select
                  value={form.areaUnit}
                  onChange={(e) => set("areaUnit", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AREA_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create Listing"}
          </button>
        </form>
      </div>
    </main>
  );
}
