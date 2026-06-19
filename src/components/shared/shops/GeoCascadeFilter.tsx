"use client";

import { useState, useEffect } from "react";

interface Area {
  id: string;
  name: string;
  slug: string;
}

interface GeoCascadeFilterProps {
  /** Called when the user selects an area (regionId) */
  onRegionChange: (regionId: string | null) => void;
  initialRegionId?: string;
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 14,
  fontFamily: "var(--body)",
  color: "var(--ink)",
  background: "var(--paper)",
  outline: "none",
  appearance: "none",
  cursor: "pointer",
};

export default function GeoCascadeFilter({ onRegionChange, initialRegionId }: GeoCascadeFilterProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [regionId, setRegionId] = useState(initialRegionId ?? "");

  // Load countries on mount
  useEffect(() => {
    fetch("/api/regions?cascade=countries")
      .then((r) => r.json())
      .then((j: { data: string[] }) => setCountries(j.data ?? []))
      .catch(() => null);
  }, []);

  // Load cities when country changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!country) { setCities([]); setCity(""); setAreas([]); setRegionId(""); return; }
    fetch(`/api/regions?cascade=cities&country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((j: { data: string[] }) => setCities(j.data ?? []))
      .catch(() => null);
    setCity("");
    setAreas([]);
    setRegionId("");
  }, [country]);

  // Load areas when city changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!city || !country) { setAreas([]); setRegionId(""); return; }
    fetch(`/api/regions?cascade=areas&country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((j: { data: Area[] }) => setAreas(j.data ?? []))
      .catch(() => null);
    setRegionId("");
  }, [city, country]);

  function handleRegionChange(id: string) {
    setRegionId(id);
    onRegionChange(id || null);
  }

  return (
    <div className="x-grid-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Country
        </span>
        <select value={country} onChange={(e) => setCountry(e.target.value)} style={selectStyle}>
          <option value="">Any country</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          City
        </span>
        <select value={city} onChange={(e) => setCity(e.target.value)} style={selectStyle} disabled={!country}>
          <option value="">Any city</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Area
        </span>
        <select value={regionId} onChange={(e) => handleRegionChange(e.target.value)} style={selectStyle} disabled={!city}>
          <option value="">Any area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
