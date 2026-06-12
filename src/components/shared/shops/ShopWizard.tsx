"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GeoCascadeFilter from "./GeoCascadeFilter";
import WorkingHoursEditor from "./WorkingHoursEditor";
import { CATEGORIES, getTypesForCategory } from "@/lib/shop-categories";
import { inputStyle, selectStyle, labelStyle, labelTextStyle } from "./formStyles";

const DRAFT_KEY = "xplosale.shop-wizard-draft.v1";

const STEPS = [
  { title: "Shop basics", tip: "What is your shop called and what do you sell? Pick the category your customers would search for." },
  { title: "Where is your shop?", tip: "Customers find you by area. Enter the street address exactly as you'd tell a customer on the phone." },
  { title: "Tell customers more", tip: "A good description and a phone number help customers trust your shop. Working hours are optional — you can add them later." },
  { title: "Review & create", tip: "Check everything looks right. You can add photos, products, and payment methods right after this." },
] as const;

interface DraftState {
  step: number;
  name: string;
  category: string;
  type: string;
  description: string;
  addressLine: string;
  regionId: string;
  website: string;
  contactPhone: string;
  workingHours: Record<string, string>;
  savedAt: number;
}

export default function ShopWizard() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [regionId, setRegionId] = useState("");
  const [website, setWebsite] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [workingHours, setWorkingHours] = useState<Record<string, string>>({});
  const [showHours, setShowHours] = useState(false);

  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<DraftState | null>(null);
  const restored = useRef(false);

  // Detect saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftState;
        if (parsed.name || parsed.category || parsed.description) setDraft(parsed);
      }
    } catch { /* corrupted draft — ignore */ }
  }, []);

  // Persist draft (debounced)
  useEffect(() => {
    if (saving) return;
    const t = setTimeout(() => {
      const hasContent = name || category || description || addressLine;
      if (!hasContent) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          step, name, category, type, description, addressLine, regionId,
          website, contactPhone, workingHours, savedAt: Date.now(),
        } satisfies DraftState));
      } catch { /* storage full — ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [step, name, category, type, description, addressLine, regionId, website, contactPhone, workingHours, saving]);

  function restoreDraft() {
    if (!draft) return;
    restored.current = true;
    setName(draft.name); setCategory(draft.category); setType(draft.type);
    setDescription(draft.description); setAddressLine(draft.addressLine);
    setRegionId(draft.regionId); setWebsite(draft.website);
    setContactPhone(draft.contactPhone); setWorkingHours(draft.workingHours ?? {});
    if (Object.keys(draft.workingHours ?? {}).length > 0) setShowHours(true);
    setStep(Math.min(draft.step, 3));
    setDraft(null);
  }

  function discardDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDraft(null);
  }

  const availableTypes = category ? getTypesForCategory(category) : [];

  // Per-step validation mirroring the server zod schema
  const stepValid = [
    name.trim().length >= 2 && name.trim().length <= 100 && !!category && !!type,
    addressLine.trim().length >= 5 && addressLine.trim().length <= 300 && !!regionId,
    description.trim().length >= 10 && description.trim().length <= 2000,
    true,
  ][step];

  function next() {
    if (!stepValid) { setAttempted(true); return; }
    setAttempted(false);
    setStep((s) => Math.min(s + 1, 3));
  }

  function back() {
    setAttempted(false);
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleCreate() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
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
        setSaving(false);
        return;
      }

      const shopId = json.data!.id;

      const hours = Object.fromEntries(Object.entries(workingHours).filter(([, v]) => v.trim() !== ""));
      if (Object.keys(hours).length > 0) {
        await fetch(`/api/shops/${shopId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workingHours: hours }),
        }).catch(() => { /* non-fatal — editable later */ });
      }

      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      router.push(`/shops/manage/${shopId}`);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  const focusProps = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      (e.currentTarget.style.borderColor = "var(--clay)"),
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      (e.currentTarget.style.borderColor = "var(--line)"),
  };

  const summaryRow = (label: string, val: string, editStep: number) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)", width: 92, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: "var(--ink)", flex: 1, wordBreak: "break-word" }}>{val || "—"}</span>
      <button
        type="button"
        onClick={() => { setStep(editStep); setAttempted(false); }}
        style={{ background: "none", border: "none", color: "var(--clay)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)", padding: 0, flexShrink: 0 }}
      >
        Edit
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--body)" }}>

      {/* Resume draft banner */}
      {draft && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          padding: "12px 16px", background: "rgba(160,78,55,.06)", border: "1px solid var(--clay)",
          borderRadius: 12, marginBottom: 20,
        }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
            📝 You have an unfinished shop draft{draft.name ? ` — “${draft.name}”` : ""}. Continue where you left off?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={restoreDraft} style={{ padding: "7px 16px", background: "var(--clay)", color: "var(--white)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)" }}>
              Resume draft
            </button>
            <button type="button" onClick={discardDraft} style={{ padding: "7px 16px", background: "transparent", color: "var(--ink-faint)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--body)" }}>
              Start fresh
            </button>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 14 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "0 0 auto" }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
                background: i < step ? "var(--green)" : i === step ? "var(--clay)" : "var(--paper-2)",
                color: i <= step ? "var(--white)" : "var(--ink-faint)",
                border: i <= step ? "none" : "1.5px solid var(--line)",
                transition: "background .25s, color .25s",
              }}>
                {i < step ? "✓" : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 3, margin: "0 6px", borderRadius: 99, background: "var(--paper-2)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "var(--green)", width: i < step ? "100%" : "0%", transition: "width .35s ease" }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 4px" }}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(20px,3.5vw,26px)", color: "var(--ink)", margin: "0 0 6px" }}>
          {STEPS[step].title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
          {STEPS[step].tip}
        </p>
      </div>

      {/* Step content */}
      <div key={step} style={{ display: "flex", flexDirection: "column", gap: 20, animation: "fadeUp .35s cubic-bezier(.16,1,.3,1)" }}>

        {step === 0 && (
          <>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Shop Name <span style={{ color: "var(--clay)" }}>*</span></span>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ahmed's Electronics" maxLength={100} style={inputStyle} {...focusProps}
              />
              {attempted && name.trim().length < 2 && (
                <span style={{ fontSize: 12, color: "var(--clay)" }}>Please enter your shop name (at least 2 letters).</span>
              )}
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Category <span style={{ color: "var(--clay)" }}>*</span></span>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setType(""); }}
                style={selectStyle} {...focusProps}
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => <option key={c.label} value={c.label}>{c.icon} {c.label}</option>)}
              </select>
              {attempted && !category && (
                <span style={{ fontSize: 12, color: "var(--clay)" }}>Pick the category that best matches what you sell.</span>
              )}
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Shop Type <span style={{ color: "var(--clay)" }}>*</span></span>
              <select
                value={type} onChange={(e) => setType(e.target.value)} disabled={!category}
                style={{ ...selectStyle, opacity: category ? 1 : 0.5 }} {...focusProps}
              >
                <option value="">{category ? "Select type…" : "Pick a category first"}</option>
                {availableTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {attempted && category && !type && (
                <span style={{ fontSize: 12, color: "var(--clay)" }}>Choose your shop type.</span>
              )}
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Street Address <span style={{ color: "var(--clay)" }}>*</span></span>
              <input
                type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)}
                placeholder="e.g. Shop 12, Block C, Main Boulevard" maxLength={300} style={inputStyle} {...focusProps}
              />
              {attempted && addressLine.trim().length < 5 && (
                <span style={{ fontSize: 12, color: "var(--clay)" }}>Enter the full address (at least 5 characters).</span>
              )}
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={labelTextStyle}>Area <span style={{ color: "var(--clay)" }}>*</span></span>
              <GeoCascadeFilter onRegionChange={(id) => setRegionId(id ?? "")} initialRegionId={regionId || undefined} />
              {attempted && !regionId ? (
                <span style={{ fontSize: 12, color: "var(--clay)" }}>Select country → city → area so customers nearby can find you.</span>
              ) : !regionId ? (
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Select country → city → area.</span>
              ) : null}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Description <span style={{ color: "var(--clay)" }}>*</span></span>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your shop, what you sell, and what makes it special…"
                maxLength={2000} rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 90 }} {...focusProps}
              />
              <span style={{ fontSize: 11, color: description.trim().length >= 10 ? "var(--ink-faint)" : "var(--clay)", alignSelf: "flex-end" }}>
                {description.length}/2000{description.trim().length < 10 ? " — at least 10 characters" : ""}
              </span>
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Contact Phone <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional, recommended)</span></span>
              <input
                type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+92 300 0000000" maxLength={20} style={inputStyle} {...focusProps}
              />
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Customers can call or WhatsApp you directly from your shop page.</span>
            </label>

            <label style={labelStyle}>
              <span style={labelTextStyle}>Website <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span></span>
              <input
                type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourshop.com" style={inputStyle} {...focusProps}
              />
            </label>

            <div>
              <button
                type="button"
                onClick={() => setShowHours((v) => !v)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "var(--body)" }}
              >
                <span style={{ display: "inline-block", transform: showHours ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>
                Working hours <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>(optional)</span>
              </button>
              {showHours && (
                <div style={{ marginTop: 12 }}>
                  <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
                </div>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {summaryRow("Name", name, 0)}
            {summaryRow("Category", category && type ? `${category} · ${type}` : category, 0)}
            {summaryRow("Address", addressLine, 1)}
            {summaryRow("Description", description.length > 140 ? `${description.slice(0, 140)}…` : description, 2)}
            {summaryRow("Phone", contactPhone, 2)}
            {summaryRow("Website", website, 2)}
            {summaryRow("Hours", Object.entries(workingHours).filter(([, v]) => v.trim()).length > 0 ? `${Object.entries(workingHours).filter(([, v]) => v.trim()).length} days set` : "", 2)}

            <div style={{ marginTop: 18, padding: "12px 16px", background: "var(--paper-2)", borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
                <strong>Next:</strong> after creating your shop you'll add a storefront photo, your products, and how customers can pay — then submit for review. Most shops go live within 24 hours.
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--clay)", margin: "16px 0 0", padding: "10px 14px", background: "rgba(160,78,55,.06)", borderRadius: 9 }}>
          {error}
          {error.toLowerCase().includes("upgrade") && (
            <>{" "}<Link href="/shops/manage" style={{ color: "var(--clay)", fontWeight: 700 }}>See plans →</Link></>
          )}
        </p>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", gap: 10, marginTop: 26 }}>
        {step > 0 && (
          <button
            type="button" onClick={back} disabled={saving}
            style={{ padding: "13px 22px", background: "transparent", color: "var(--ink-soft)", border: "1.5px solid var(--line)", borderRadius: 12, fontSize: 15, fontWeight: 600, fontFamily: "var(--body)", cursor: "pointer" }}
          >
            ← Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button" onClick={next}
            style={{
              flex: 1, padding: "13px 0", background: stepValid ? "var(--clay)" : "var(--paper-3)",
              color: stepValid ? "var(--white)" : "var(--ink-faint)", border: "none", borderRadius: 12,
              fontSize: 15, fontWeight: 700, fontFamily: "var(--body)", cursor: "pointer",
              transition: "background .2s",
            }}
          >
            Continue →
          </button>
        ) : (
          <button
            type="button" onClick={() => void handleCreate()} disabled={saving}
            style={{
              flex: 1, padding: "13px 0", background: "var(--green)", color: "var(--white)",
              border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, fontFamily: "var(--body)",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Creating your shop…" : "🎉 Create my shop"}
          </button>
        )}
      </div>
    </div>
  );
}
