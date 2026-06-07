"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GeoCascadeFilter from "./GeoCascadeFilter";
import { CATEGORIES, getTypesForCategory } from "@/lib/shop-categories";

interface ShopFormProps {
  initialData?: {
    id: string;
    name: string;
    category: string;
    type: string;
    description: string;
    addressLine: string;
    regionId: string;
    website?: string | null;
    contactPhone?: string | null;
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--line)",
  borderRadius: 11,
  fontSize: 15,
  fontFamily: "var(--body)",
  color: "var(--ink)",
  background: "var(--paper)",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink-soft)",
};

export default function ShopForm({ initialData }: ShopFormProps) {
  const router = useRouter();
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [type, setType] = useState(initialData?.type ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [addressLine, setAddressLine] = useState(initialData?.addressLine ?? "");
  const [regionId, setRegionId] = useState(initialData?.regionId ?? "");
  const [website, setWebsite] = useState(initialData?.website ?? "");
  const [contactPhone, setContactPhone] = useState(initialData?.contactPhone ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableTypes = category ? getTypesForCategory(category) : [];

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    setType("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!regionId) { setError("Please select a country, city, and area."); return; }
    setError("");
    setSaving(true);

    try {
      const url = isEdit ? `/api/shops/${initialData!.id}` : "/api/shops";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          type,
          description: description.trim(),
          addressLine: addressLine.trim(),
          regionId,
          website: website.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
        }),
      });

      const json = await res.json() as { ok: boolean; error?: string; details?: unknown; data?: { id: string } };

      if (!res.ok || !json.ok) {
        if (res.status === 402) {
          setError(json.error ?? "Upgrade required");
        } else if (json.details && typeof json.details === "object") {
          const fields = json.details as Record<string, string[]>;
          setError(Object.values(fields).flat().join(". "));
        } else {
          setError(json.error ?? "Something went wrong.");
        }
        return;
      }

      router.push("/shops/manage");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "var(--body)" }}>

      {/* Name */}
      <label style={labelStyle}>
        <span style={labelTextStyle}>Shop Name <span style={{ color: "var(--clay)" }}>*</span></span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Ahmed's Electronics"
          required
          minLength={2}
          maxLength={100}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
        />
      </label>

      {/* Category + Type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label style={labelStyle}>
          <span style={labelTextStyle}>Category <span style={{ color: "var(--clay)" }}>*</span></span>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
            style={selectStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            <option value="">Select category…</option>
            {CATEGORIES.map((c) => <option key={c.label} value={c.label}>{c.icon} {c.label}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          <span style={labelTextStyle}>Type <span style={{ color: "var(--clay)" }}>*</span></span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            disabled={!category}
            style={{ ...selectStyle, opacity: category ? 1 : 0.5 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
          >
            <option value="">Select type…</option>
            {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {/* Description */}
      <label style={labelStyle}>
        <span style={labelTextStyle}>Description <span style={{ color: "var(--clay)" }}>*</span></span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your shop, what you sell, and what makes it special…"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
        />
        <span style={{ fontSize: 11, color: "var(--ink-faint)", alignSelf: "flex-end" }}>{description.length}/2000</span>
      </label>

      {/* Address */}
      <label style={labelStyle}>
        <span style={labelTextStyle}>Address <span style={{ color: "var(--clay)" }}>*</span></span>
        <input
          type="text"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="e.g. Shop 12, Block C, Main Boulevard"
          required
          minLength={5}
          maxLength={300}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
        />
      </label>

      {/* Geo cascade */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={labelTextStyle}>Location <span style={{ color: "var(--clay)" }}>*</span></span>
        <GeoCascadeFilter onRegionChange={(id) => setRegionId(id ?? "")} initialRegionId={regionId} />
        {!regionId && (
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
            Select country → city → area to set the shop location.
          </p>
        )}
      </div>

      {/* Website (optional) */}
      <label style={labelStyle}>
        <span style={labelTextStyle}>Website <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span></span>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourshop.com"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
        />
      </label>

      {/* Contact phone (optional) */}
      <label style={labelStyle}>
        <span style={labelTextStyle}>Contact Phone <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span></span>
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="+92 300 0000000"
          maxLength={20}
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
        />
      </label>

      {error && (
        <p style={{ fontSize: 13, color: "var(--clay)", margin: 0, padding: "10px 14px", background: "rgba(160,78,55,.06)", borderRadius: 9 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !name || !category || !type || !description || !addressLine || !regionId}
        style={{
          padding: "13px 0",
          background: "var(--clay)",
          color: "var(--white)",
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "var(--body)",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
          transition: "opacity .15s",
        }}
      >
        {saving ? (isEdit ? "Saving…" : "Creating shop…") : (isEdit ? "Save changes" : "Create shop")}
      </button>
    </form>
  );
}
