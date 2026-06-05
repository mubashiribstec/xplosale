"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const SHOP_CATEGORIES = [
  "Clothing & Fashion", "Food & Groceries", "Electronics", "Mobile Phones & Accessories",
  "Furniture & Home Decor", "Jewellery & Accessories", "Sports & Fitness",
  "Books & Stationery", "Health & Beauty", "Toys & Games", "Hardware & Tools",
  "Auto Parts", "Bakery & Confectionery", "Pharmacy & Medical", "Other",
];

interface Props {
  initialParams: {
    q?: string;
    category?: string;
    country?: string;
    city?: string;
    regionId?: string;
  };
}

export default function ShopsFilterBar({ initialParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(initialParams.q ?? "");
  const [category, setCategory] = useState(initialParams.category ?? "");
  const [country, setCountry] = useState(initialParams.country ?? "");
  const [city, setCity] = useState(initialParams.city ?? "");
  const [regionId, setRegionId] = useState(initialParams.regionId ?? "");

  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    void fetch("/api/regions?cascade=countries")
      .then((r) => r.json() as Promise<{ data?: string[] }>)
      .then((j) => { if (j.data) setCountries(j.data); });
  }, []);

  useEffect(() => {
    if (!country) { setCities([]); setAreas([]); return; }
    void fetch(`/api/regions?cascade=cities&country=${encodeURIComponent(country)}`)
      .then((r) => r.json() as Promise<{ data?: string[] }>)
      .then((j) => { if (j.data) setCities(j.data); });
  }, [country]);

  useEffect(() => {
    if (!country || !city) { setAreas([]); return; }
    void fetch(`/api/regions?cascade=areas&country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`)
      .then((r) => r.json() as Promise<{ data?: { id: string; name: string }[] }>)
      .then((j) => { if (j.data) setAreas(j.data); });
  }, [country, city]);

  function navigate(params: { q: string; category: string; country: string; city: string; regionId: string }) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) p.set(k, v);
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q, category, country, city, regionId });
  }

  function handleCountryChange(v: string) {
    setCountry(v); setCity(""); setRegionId("");
    navigate({ q, category, country: v, city: "", regionId: "" });
  }

  function handleCityChange(v: string) {
    setCity(v); setRegionId("");
    navigate({ q, category, country, city: v, regionId: "" });
  }

  function handleAreaChange(v: string) {
    setRegionId(v);
    navigate({ q, category, country, city, regionId: v });
  }

  function handleCategoryChange(v: string) {
    setCategory(v);
    navigate({ q, category: v, country, city, regionId });
  }

  function handleClear() {
    setQ(""); setCategory(""); setCountry(""); setCity(""); setRegionId("");
    router.push(pathname);
  }

  const hasFilters = q || category || country;

  return (
    <div style={{ fontFamily: "var(--body)", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Search row */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shops…"
          style={{
            flex: 1, padding: "10px 14px", border: "1.5px solid var(--line)",
            borderRadius: 10, fontSize: 14, fontFamily: "var(--body)",
            color: "var(--ink)", background: "var(--white)", outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px", background: "var(--clay)", color: "var(--white)",
            border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
            fontFamily: "var(--body)", cursor: "pointer",
          }}
        >
          Search
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              padding: "10px 14px", background: "transparent", color: "var(--ink-faint)",
              border: "1px solid var(--line)", borderRadius: 10, fontSize: 13,
              fontFamily: "var(--body)", cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Category */}
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          style={selectStyle}
        >
          <option value="">All categories</option>
          {SHOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Country */}
        <select value={country} onChange={(e) => handleCountryChange(e.target.value)} style={selectStyle}>
          <option value="">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* City */}
        {cities.length > 0 && (
          <select value={city} onChange={(e) => handleCityChange(e.target.value)} style={selectStyle}>
            <option value="">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* Area */}
        {areas.length > 0 && (
          <select value={regionId} onChange={(e) => handleAreaChange(e.target.value)} style={selectStyle}>
            <option value="">All areas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "9px 12px",
  border: "1.5px solid var(--line)",
  borderRadius: 9,
  fontSize: 13,
  fontFamily: "var(--body)",
  color: "var(--ink)",
  background: "var(--white)",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
};
