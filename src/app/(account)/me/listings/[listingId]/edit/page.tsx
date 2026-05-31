"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/shared/ImageUploader";

interface Region {
  id: string;
  name: string;
  slug: string;
  city: string;
}

interface ListingImage {
  id: string;
  url: string;
  order: number;
  width: number;
  height: number;
}

interface ListingData {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  status: string;
  regionId: string;
  propertyType: string | null;
  beds: number | null;
  baths: number | null;
  areaValue: number | null;
  areaUnit: string | null;
  lat: number | null;
  lng: number | null;
  images: ListingImage[];
}

const PROPERTY_TYPES = ["HOUSE", "APARTMENT", "PLOT", "COMMERCIAL", "OTHER"] as const;
const AREA_UNITS = ["Marla", "Kanal", "sqft", "sqyd", "acre"];

export default function EditListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = use(params);
  const router = useRouter();
  const [listing, setListing] = useState<ListingData | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
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
    Promise.all([
      fetch(`/api/listings/${listingId}`).then((r) => r.json()),
      fetch("/api/regions").then((r) => r.json()),
    ]).then(([listingRes, regionsRes]) => {
      if (listingRes.ok && listingRes.data) {
        const d = listingRes.data as ListingData;
        setListing(d);
        setImages(d.images);
        setForm({
          title: d.title,
          description: d.description,
          price: String(Number(d.price)),
          regionId: d.regionId,
          propertyType: d.propertyType ?? "",
          beds: d.beds != null ? String(d.beds) : "",
          baths: d.baths != null ? String(d.baths) : "",
          areaValue: d.areaValue != null ? String(d.areaValue) : "",
          areaUnit: d.areaUnit ?? "Marla",
          lat: d.lat != null ? String(d.lat) : "",
          lng: d.lng != null ? String(d.lng) : "",
        });
      }
      if (regionsRes.data) setRegions(regionsRes.data as Region[]);
    });
  }, [listingId]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      regionId: form.regionId,
    };
    if (form.propertyType) body.propertyType = form.propertyType;
    if (form.beds) body.beds = parseInt(form.beds, 10);
    if (form.baths) body.baths = parseInt(form.baths, 10);
    if (form.areaValue) { body.areaValue = parseFloat(form.areaValue); body.areaUnit = form.areaUnit; }
    if (form.lat) body.lat = parseFloat(form.lat);
    if (form.lng) body.lng = parseFloat(form.lng);

    const res = await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { ok: boolean; data?: ListingData; error?: string };
    setLoading(false);

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Save failed");
      return;
    }

    setListing(json.data!);
    setMsg("Saved!");
    setTimeout(() => setMsg(null), 2000);
  }

  async function submitForReview() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING_REVIEW" }),
    });
    const json = await res.json() as { ok: boolean; data?: ListingData; error?: string };
    setLoading(false);
    if (!res.ok || !json.ok) { setError(json.error ?? "Failed"); return; }
    setListing(json.data!);
    setMsg("Submitted for review!");
  }

  async function deleteImage(imageId: string) {
    const res = await fetch(`/api/listings/${listingId}/images/${imageId}`, { method: "DELETE" });
    const json = await res.json() as { ok: boolean };
    if (json.ok) setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  async function handleImageUpload(result: { key: string; url: string; width: number; height: number }) {
    const nextOrder = images.length;
    const res = await fetch(`/api/listings/${listingId}/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: result.key, url: result.url, width: result.width, height: result.height, order: nextOrder }),
    });
    const json = await res.json() as { ok: boolean; data?: ListingImage };
    if (json.ok && json.data) setImages((prev) => [...prev, json.data!]);
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button type="button" onClick={() => router.push("/me/listings")} className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to listings
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Edit Listing</h1>
          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {listing.status.replace("_", " ")}
          </span>
        </div>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Images</h2>
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group w-24 h-24">
                <img
                  src={`/api/upload/serve-public/${img.url}`}
                  alt=""
                  className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => deleteImage(img.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          {images.length < 10 && (
            <ImageUploader
              purpose="listing_image"
              listingId={listingId}
              onUpload={handleImageUpload}
              label="Add image"
            />
          )}
        </section>

        <form onSubmit={handleSave} className="space-y-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input type="number" step="any" value={form.lat} onChange={(e) => set("lat", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input type="number" step="any" value={form.lng} onChange={(e) => set("lng", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Property Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
              <select value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select type</option>
                {PROPERTY_TYPES.map((pt) => <option key={pt} value={pt}>{pt.charAt(0) + pt.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input type="number" value={form.beds} onChange={(e) => set("beds", e.target.value)} min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input type="number" value={form.baths} onChange={(e) => set("baths", e.target.value)} min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area size</label>
                <input type="number" step="any" value={form.areaValue} onChange={(e) => set("areaValue", e.target.value)} min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area unit</label>
                <select value={form.areaUnit} onChange={(e) => set("areaUnit", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {AREA_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {msg && <p className="text-sm text-green-600">{msg}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>

            {listing.status === "DRAFT" && (
              <button
                type="button"
                onClick={submitForReview}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Submit for Review
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
