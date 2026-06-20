"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface LedgerEntry {
  id: string;
  type: "ACCRUAL" | "SETTLEMENT" | "ADJUSTMENT";
  amount: number;
  rate: number | null;
  orderTotal: number | null;
  note: string | null;
  createdAt: string;
}

interface CommissionData {
  billingMode: "SUBSCRIPTION" | "COMMISSION";
  rate: number;
  customRate: number | null;
  balance: number;
  entries: LedgerEntry[];
}

interface Props {
  shopId: string;
  /** True when the shop has an active paid (Premium/Promotion) subscription. */
  hasActivePaidSub: boolean;
}

const fmt = (n: number) => `PKR ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const ENTRY_LABEL: Record<LedgerEntry["type"], string> = {
  ACCRUAL: "Order commission",
  SETTLEMENT: "Settlement",
  ADJUSTMENT: "Adjustment",
};

export default function BillingModeSwitch({ shopId, hasActivePaidSub }: Props) {
  const router = useRouter();
  const [data, setData] = useState<CommissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [confirmBack, setConfirmBack] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shops/${shopId}/commission`);
      if (res.ok) {
        const json = await res.json() as { data: CommissionData };
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { void load(); }, [load]);

  async function switchMode(mode: "SUBSCRIPTION" | "COMMISSION") {
    setWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/billing-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) { setError(json.error ?? "Could not change billing mode."); return; }
      await load();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setWorking(false);
      setConfirmBack(false);
    }
  }

  if (loading) {
    return <p style={{ fontSize: 13, color: "var(--ink-faint)", fontFamily: "var(--body)" }}>Loading billing…</p>;
  }
  if (!data) return null;

  const isCommission = data.billingMode === "COMMISSION";

  return (
    <div style={{ fontFamily: "var(--body)" }}>
      {!isCommission ? (
        <div style={{
          background: "rgba(37,99,235,.04)", border: "1px solid rgba(37,99,235,.25)",
          borderRadius: 14, padding: "18px 20px",
        }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#1d4ed8", margin: "0 0 4px" }}>
            💼 Pay with commission instead
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 6px", lineHeight: 1.6 }}>
            No monthly fee. Get all <strong>Premium features</strong> (30 products, 5 images each,
            featured placement, analytics) and instead give Xplosale a small commission of{" "}
            <strong>{data.rate}%</strong> on each completed order. You settle the balance with us periodically.
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "0 0 14px" }}>
            Buyers still pay you directly — commission is tracked here and settled offline.
          </p>
          {hasActivePaidSub && (
            <p style={{ fontSize: 12, color: "#d97706", margin: "0 0 12px" }}>
              ⚠ Cancel your active paid subscription first to switch to commission billing.
            </p>
          )}
          {error && <p style={{ fontSize: 13, color: "var(--clay)", margin: "0 0 10px" }}>{error}</p>}
          <button
            type="button"
            onClick={() => void switchMode("COMMISSION")}
            disabled={working || hasActivePaidSub}
            style={{
              padding: "10px 22px", background: "#1d4ed8", color: "#fff", border: "none",
              borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: (working || hasActivePaidSub) ? "not-allowed" : "pointer",
              opacity: (working || hasActivePaidSub) ? 0.5 : 1,
            }}
          >
            {working ? "Switching…" : "Switch to commission billing"}
          </button>
        </div>
      ) : (
        <div style={{
          background: "rgba(37,99,235,.04)", border: "1px solid rgba(37,99,235,.25)",
          borderRadius: 14, padding: "18px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#1d4ed8", margin: 0 }}>
              💼 Commission billing active · {data.rate}% per sale
            </p>
            <span style={{ fontSize: 12, color: "var(--green-deep)", fontWeight: 600 }}>Premium features unlocked</span>
          </div>

          <div style={{
            display: "flex", alignItems: "baseline", gap: 10, padding: "12px 14px",
            background: "var(--white)", border: "1px solid var(--line)", borderRadius: 10, marginBottom: 14,
          }}>
            <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>Outstanding commission owed</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: data.balance > 0 ? "var(--clay)" : "var(--green)", marginLeft: "auto" }}>
              {fmt(data.balance)}
            </span>
          </div>

          {data.entries.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 8px" }}>
                Recent activity
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.entries.slice(0, 6).map((e) => (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--ink-soft)" }}>
                    <span>
                      {ENTRY_LABEL[e.type]}
                      {e.orderTotal != null && <span style={{ color: "var(--ink-faint)" }}> · order {fmt(e.orderTotal)}</span>}
                      <span style={{ color: "var(--ink-faint)" }}> · {new Date(e.createdAt).toLocaleDateString("en-PK")}</span>
                    </span>
                    <span style={{ fontWeight: 600, color: e.amount >= 0 ? "var(--clay)" : "var(--green)" }}>
                      {e.amount >= 0 ? "+" : "−"}{fmt(Math.abs(e.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: 13, color: "var(--clay)", margin: "0 0 10px" }}>{error}</p>}
          {!confirmBack ? (
            <button
              type="button"
              onClick={() => setConfirmBack(true)}
              disabled={working}
              style={{
                padding: "8px 16px", background: "transparent", color: "var(--ink-soft)",
                border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, fontWeight: 600,
                cursor: working ? "not-allowed" : "pointer",
              }}
            >
              Switch back to subscription billing
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                Switch to subscription? Any owed commission stays due.
              </span>
              <button
                type="button"
                onClick={() => void switchMode("SUBSCRIPTION")}
                disabled={working}
                style={{ padding: "8px 16px", background: "var(--clay)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: working ? 0.6 : 1 }}
              >
                {working ? "Switching…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBack(false)}
                style={{ padding: "8px 16px", background: "transparent", color: "var(--ink-faint)", border: "1px solid var(--line)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
