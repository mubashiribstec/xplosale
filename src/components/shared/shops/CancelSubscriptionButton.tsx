"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  shopId: string;
}

export default function CancelSubscriptionButton({ shopId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel your Premium subscription? Products over the Free limit (4) will be hidden immediately.")) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/subscription/cancel`, { method: "POST" });
      const json = await res.json() as { ok: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Cancellation failed.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push(`/shops/manage/${shopId}`), 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p style={{ fontSize: 14, color: "var(--ink-faint)", fontFamily: "var(--body)" }}>Subscription cancelled. Redirecting…</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
      <button
        type="button"
        onClick={() => void handleCancel()}
        disabled={loading}
        style={{
          padding: "9px 20px",
          background: "transparent",
          color: "var(--clay)",
          border: "1.5px solid var(--clay)",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "var(--body)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Cancelling…" : "Cancel Subscription"}
      </button>
      {error && (
        <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
