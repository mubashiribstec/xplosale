"use client";

import { useState } from "react";

interface ShopPaymentSettingsProps {
  shopId: string;
  initial: {
    bankName: string | null;
    bankAccountTitle: string | null;
    bankAccountNumber: string | null;
    jazzcashNumber: string | null;
    easipaisaNumber: string | null;
    acceptsCash: boolean;
    acceptsDelivery: boolean;
    deliveryNotes: string | null;
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "var(--body)",
  background: "var(--paper)",
  color: "var(--ink)",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink-soft)",
  marginBottom: 4,
  display: "block",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--ink)",
  margin: "20px 0 10px",
};

export default function ShopPaymentSettings({ shopId, initial }: ShopPaymentSettingsProps) {
  const [bankName, setBankName] = useState(initial.bankName ?? "");
  const [bankAccountTitle, setBankAccountTitle] = useState(initial.bankAccountTitle ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(initial.bankAccountNumber ?? "");
  const [jazzcashNumber, setJazzcashNumber] = useState(initial.jazzcashNumber ?? "");
  const [easipaisaNumber, setEasipaisaNumber] = useState(initial.easipaisaNumber ?? "");
  const [acceptsCash, setAcceptsCash] = useState(initial.acceptsCash);
  const [acceptsDelivery, setAcceptsDelivery] = useState(initial.acceptsDelivery);
  const [deliveryNotes, setDeliveryNotes] = useState(initial.deliveryNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: bankName || null,
          bankAccountTitle: bankAccountTitle || null,
          bankAccountNumber: bankAccountNumber || null,
          jazzcashNumber: jazzcashNumber || null,
          easipaisaNumber: easipaisaNumber || null,
          acceptsCash,
          acceptsDelivery,
          deliveryNotes: deliveryNotes || null,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to save settings");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} style={{ fontFamily: "var(--body)" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 4px" }}>
        Payment Settings
      </p>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "0 0 16px" }}>
        Enable payment methods and enter your account details so customers can pay you directly.
      </p>

      {/* Platform disclaimer */}
      <div style={{
        background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.25)",
        borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12,
        color: "#92400e", lineHeight: 1.5,
      }}>
        <strong>Important:</strong> Xplosale does not process payments and is not responsible for any fraud or disputes arising from direct transactions. Verify payment details carefully before sharing.
      </div>

      {/* Cash */}
      <p style={sectionTitle}>Cash & Delivery</p>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink)", cursor: "pointer", marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={acceptsCash}
          onChange={(e) => setAcceptsCash(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        Accept Cash on pickup/delivery
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ink)", cursor: "pointer", marginBottom: 10 }}>
        <input
          type="checkbox"
          checked={acceptsDelivery}
          onChange={(e) => setAcceptsDelivery(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        Offer delivery to customers
      </label>
      {acceptsDelivery && (
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Delivery Notes</label>
          <textarea
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="e.g. Lahore only · 1–2 days · PKR 150 delivery fee"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      )}

      {/* Bank Transfer */}
      <p style={sectionTitle}>Bank Transfer</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={labelStyle}>Bank Name</label>
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} maxLength={100} placeholder="e.g. HBL, MCB, UBL" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Account Title</label>
          <input type="text" value={bankAccountTitle} onChange={(e) => setBankAccountTitle(e.target.value)} maxLength={100} placeholder="Account holder name" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Account Number / IBAN</label>
          <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} maxLength={50} placeholder="PK36SCBL0000001123456702" style={inputStyle} />
        </div>
      </div>

      {/* JazzCash */}
      <p style={sectionTitle}>JazzCash</p>
      <div>
        <label style={labelStyle}>JazzCash Mobile Number</label>
        <input type="text" value={jazzcashNumber} onChange={(e) => setJazzcashNumber(e.target.value)} maxLength={30} placeholder="03XX-XXXXXXX" style={inputStyle} />
      </div>

      {/* EasyPaisa */}
      <p style={sectionTitle}>EasyPaisa</p>
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>EasyPaisa Mobile Number</label>
        <input type="text" value={easipaisaNumber} onChange={(e) => setEasipaisaNumber(e.target.value)} maxLength={30} placeholder="03XX-XXXXXXX" style={inputStyle} />
      </div>

      {error && <p style={{ fontSize: 13, color: "var(--clay)", margin: "0 0 10px" }}>{error}</p>}
      {saved && <p style={{ fontSize: 13, color: "var(--green)", margin: "0 0 10px" }}>✓ Settings saved</p>}

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "10px 24px", background: "var(--clay)", color: "var(--white)",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
          fontFamily: "var(--body)", cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving…" : "Save Payment Settings"}
      </button>
    </form>
  );
}
