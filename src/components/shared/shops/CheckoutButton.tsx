"use client";

import { useState } from "react";

interface Props {
  shopId: string;
}

export default function CheckoutButton({ shopId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/checkout`, { method: "POST" });
      const json = await res.json() as { ok: boolean; data?: { url: string }; error?: string };

      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Checkout failed. Please try again.");
        return;
      }

      window.location.href = json.data.url;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        style={{
          padding: "11px 28px",
          background: "var(--clay)",
          color: "var(--white)",
          border: "none",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "var(--body)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "opacity .15s",
        }}
      >
        {loading ? "Redirecting…" : "Upgrade to Premium →"}
      </button>
      {error && (
        <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
