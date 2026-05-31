"use client";

import { useRouter, usePathname } from "next/navigation";

interface Region {
  id: string;
  name: string;
  slug: string;
  city?: string;
}

interface ListingFiltersProps {
  regions: Region[];
  searchParams: Record<string, string>;
}

const PROPERTY_TYPES = [
  { value: "", label: "All types" },
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "PLOT", label: "Plot" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "OTHER", label: "Other" },
];

const BEDS_OPTIONS = [
  { value: "", label: "Any beds" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

export default function ListingFilters({ regions, searchParams }: ListingFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3">
      <select
        value={searchParams.region ?? ""}
        onChange={(e) => update("region", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All regions</option>
        {regions.map((r) => (
          <option key={r.id} value={r.slug}>
            {r.city ? `${r.city} — ` : ""}{r.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.propertyType ?? ""}
        onChange={(e) => update("propertyType", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {PROPERTY_TYPES.map((pt) => (
          <option key={pt.value} value={pt.value}>{pt.label}</option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Min price"
        defaultValue={searchParams.minPrice ?? ""}
        onBlur={(e) => update("minPrice", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
      />

      <input
        type="number"
        placeholder="Max price"
        defaultValue={searchParams.maxPrice ?? ""}
        onBlur={(e) => update("maxPrice", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
      />

      <select
        value={searchParams.beds ?? ""}
        onChange={(e) => update("beds", e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {BEDS_OPTIONS.map((b) => (
          <option key={b.value} value={b.value}>{b.label}</option>
        ))}
      </select>
    </div>
  );
}
