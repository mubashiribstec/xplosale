"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EscrowWidgetProps {
  listingId: string;
  listingPrice: string;
  currency: string;
  sellerId: string;
  currentUserId: string | null;
  existingEscrow: {
    id: string;
    status: string;
    amount: string;
    buyerId: string;
    sellerId: string;
  } | null;
}

export default function EscrowWidget({
  listingId,
  listingPrice,
  currency,
  sellerId,
  currentUserId,
  existingEscrow,
}: EscrowWidgetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  const isSeller = currentUserId === sellerId;

  async function handleBuyWithEscrow() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError((json as { error?: string }).error ?? "Failed to create escrow");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReceipt() {
    if (!existingEscrow) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escrow/${existingEscrow.id}/confirm-receipt`, {
        method: "POST",
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError((json as { error?: string }).error ?? "Failed to confirm receipt");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!existingEscrow) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escrow/${existingEscrow.id}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError((json as { error?: string }).error ?? "Failed to raise dispute");
        return;
      }
      setShowDisputeForm(false);
      setDisputeReason("");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: "16px",
    background: "var(--paper)",
    fontFamily: "var(--body)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--ink-faint, #888)",
    marginBottom: 8,
    display: "block",
  };

  const primaryBtnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "11px 16px",
    background: "var(--ink)",
    color: "var(--white)",
    border: "none",
    borderRadius: 8,
    fontFamily: "var(--body)",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "9px 16px",
    background: "transparent",
    color: "var(--ink)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    fontFamily: "var(--body)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
    marginTop: 8,
  };

  const statusBadgeStyle = (color: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    background: color === "green" ? "rgba(22,197,136,.12)" : color === "clay" ? "rgba(194,120,90,.12)" : "rgba(100,100,100,.09)",
    color: color === "green" ? "var(--green, #16c588)" : color === "clay" ? "var(--clay, #c2785a)" : "var(--ink-soft, #555)",
    marginBottom: 10,
  });

  const shieldIcon = (
    <svg width={14} height={16} viewBox="0 0 16 18" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path
        d="M8 1L14 3.5V9C14 12.3 11.4 15.3 8 17C4.6 15.3 2 12.3 2 9V3.5L8 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.18}
      />
    </svg>
  );

  // Seller view
  if (isSeller) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Escrow</span>
        {!existingEscrow && (
          <p style={{ fontSize: 13, color: "var(--ink-soft, #555)", margin: 0 }}>
            No active escrow for this listing.
          </p>
        )}
        {existingEscrow?.status === "HELD" && (
          <span style={statusBadgeStyle("green")}>{shieldIcon} Payment held in escrow</span>
        )}
        {existingEscrow?.status === "DISPUTED" && (
          <span style={statusBadgeStyle("clay")}>{shieldIcon} Dispute in progress</span>
        )}
        {existingEscrow?.status === "RELEASED" && (
          <span style={statusBadgeStyle("green")}>{shieldIcon} Complete — funds released</span>
        )}
        {existingEscrow?.status === "REFUNDED" && (
          <span style={statusBadgeStyle("neutral")}>{shieldIcon} Refunded to buyer</span>
        )}
      </div>
    );
  }

  // Unauthenticated
  if (!currentUserId) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Escrow Protection</span>
        <p style={{ fontSize: 13, color: "var(--ink-soft, #555)", margin: "0 0 12px" }}>
          Pay safely — funds are held until you confirm receipt.
        </p>
        <a href="/login" style={primaryBtnStyle}>
          Sign in to buy with escrow
        </a>
      </div>
    );
  }

  // Buyer view — no existing escrow
  if (!existingEscrow) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Escrow Protection</span>
        <p style={{ fontSize: 13, color: "var(--ink-soft, #555)", margin: "0 0 4px" }}>
          {currency} {listingPrice}
        </p>
        <p style={{ fontSize: 12, color: "var(--ink-faint, #aaa)", margin: "0 0 12px" }}>
          Funds held securely until you confirm receipt.
        </p>
        {error && <p style={{ fontSize: 13, color: "var(--clay, #c2785a)", margin: "0 0 8px" }}>{error}</p>}
        <button
          type="button"
          onClick={handleBuyWithEscrow}
          disabled={loading}
          style={{ ...primaryBtnStyle, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Processing…" : "Buy with Escrow"}
        </button>
      </div>
    );
  }

  // Buyer view — HELD
  if (existingEscrow.status === "HELD") {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Escrow Protection</span>
        <span style={statusBadgeStyle("green")}>{shieldIcon} Funds held in escrow</span>
        {error && <p style={{ fontSize: 13, color: "var(--clay, #c2785a)", margin: "0 0 8px" }}>{error}</p>}
        <button
          type="button"
          onClick={handleConfirmReceipt}
          disabled={loading}
          style={{ ...primaryBtnStyle, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Processing…" : "Confirm Receipt"}
        </button>
        {!showDisputeForm && (
          <button
            type="button"
            onClick={() => setShowDisputeForm(true)}
            style={secondaryBtnStyle}
          >
            Raise Dispute
          </button>
        )}
        {showDisputeForm && (
          <form onSubmit={handleDispute} style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>
              Reason for dispute
            </label>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              maxLength={500}
              required
              rows={3}
              placeholder="Describe the issue…"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                fontFamily: "var(--body)",
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="submit"
                disabled={loading || !disputeReason.trim()}
                style={{ ...primaryBtnStyle, background: "var(--clay, #c2785a)", flex: 1, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "Submitting…" : "Submit Dispute"}
              </button>
              <button
                type="button"
                onClick={() => { setShowDisputeForm(false); setDisputeReason(""); }}
                style={{ ...secondaryBtnStyle, marginTop: 0, flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // Buyer view — RELEASED
  if (existingEscrow.status === "RELEASED") {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Escrow</span>
        <span style={statusBadgeStyle("green")}>{shieldIcon} Complete — payment released to seller</span>
      </div>
    );
  }

  // Buyer view — REFUNDED
  if (existingEscrow.status === "REFUNDED") {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>Escrow</span>
        <span style={statusBadgeStyle("neutral")}>{shieldIcon} Refunded to buyer</span>
      </div>
    );
  }

  // Buyer view — DISPUTED
  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Escrow</span>
      <span style={statusBadgeStyle("clay")}>{shieldIcon} Dispute in progress — awaiting admin resolution</span>
    </div>
  );
}
