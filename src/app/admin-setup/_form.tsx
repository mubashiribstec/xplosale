"use client";

import { useState } from "react";

export default function BootstrapForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePromote() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/bootstrap", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to promote account.");
        return;
      }
      // Force a full session refresh then navigate to admin
      window.location.href = "/admin";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>}
      <button
        onClick={handlePromote}
        disabled={loading}
        style={{
          width: "100%",
          padding: "13px 0",
          background: "var(--ink)",
          color: "var(--white)",
          border: "none",
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          fontFamily: "var(--body)",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.15s",
        }}
      >
        {loading ? "Promoting…" : "Make me Admin"}
      </button>
    </div>
  );
}
