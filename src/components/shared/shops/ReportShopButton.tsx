"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReportShopButtonProps {
  shopId: string;
  isAuthenticated: boolean;
}

type Reason = "FRAUD" | "FAKE_PRODUCTS" | "MISLEADING" | "INAPPROPRIATE" | "SPAM" | "OTHER";

const reasonLabels: Record<Reason, string> = {
  FRAUD: "Fraud / Scam",
  FAKE_PRODUCTS: "Fake or Counterfeit Products",
  MISLEADING: "Misleading Information",
  INAPPROPRIATE: "Inappropriate Content",
  SPAM: "Spam",
  OTHER: "Other",
};

export default function ReportShopButton({ shopId, isAuthenticated }: ReportShopButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("FRAUD");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleOpen() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setOpen(true);
    setDone(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details || undefined }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to submit report.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{
          background: "none",
          border: "none",
          fontSize: 12,
          color: "var(--ink-faint)",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 6,
          fontFamily: "var(--body)",
          textDecoration: "underline",
          textUnderlineOffset: 2,
        }}
      >
        Report Shop
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,.55)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{
            background: "var(--white)", borderRadius: 18, padding: "clamp(20px,4vw,28px)",
            width: "100%", maxWidth: 420, fontFamily: "var(--body)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>Report Shop</h2>
              <button type="button" onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink-faint)", lineHeight: 1 }}>
                ×
              </button>
            </div>

            {done ? (
              <div>
                <p style={{ fontSize: 14, color: "var(--green)", fontWeight: 600, margin: "0 0 12px" }}>
                  ✓ Report submitted. Our team will review it shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "9px 20px", background: "var(--paper-2)", color: "var(--ink)",
                    border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6, display: "block" }}>
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as Reason)}
                    style={{
                      width: "100%", padding: "9px 12px", border: "1px solid var(--line)",
                      borderRadius: 8, fontSize: 14, fontFamily: "var(--body)",
                      background: "var(--paper)", color: "var(--ink)",
                    }}
                  >
                    {(Object.keys(reasonLabels) as Reason[]).map((r) => (
                      <option key={r} value={r}>{reasonLabels[r]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6, display: "block" }}>
                    Additional Details <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(optional)</span>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Describe the issue…"
                    style={{
                      width: "100%", padding: "9px 12px", border: "1px solid var(--line)",
                      borderRadius: 8, fontSize: 14, fontFamily: "var(--body)",
                      background: "var(--paper)", color: "var(--ink)",
                      resize: "vertical", boxSizing: "border-box",
                    }}
                  />
                  <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 0" }}>
                    {details.length}/500
                  </p>
                </div>

                {error && <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 0", background: "var(--clay)", color: "var(--white)",
                    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600,
                    fontFamily: "var(--body)", cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Submitting…" : "Submit Report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
