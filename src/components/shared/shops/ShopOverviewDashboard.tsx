"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

interface Stats {
  pending: number;
  inProgress: number;
  todayOrders: number;
  todaySales: number;
  products: number;
  views: number | null;
}

interface Props {
  shopId: string;
  onStats?: (stats: Stats) => void;
}

const money = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

export default function ShopOverviewDashboard({ shopId, onStats }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onStatsRef = useRef(onStats);
  useEffect(() => { onStatsRef.current = onStats; });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/shops/${shopId}/stats`);
      if (res.ok) {
        const json = await res.json() as { data: Stats };
        setStats(json.data);
        onStatsRef.current?.(json.data);
      }
    } catch { /* ignore */ }
  }, [shopId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // Live order alerts via SSE — refresh stats and pop a toast.
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnect: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`/api/shops/${shopId}/orders/stream`);
      es.onmessage = (event) => {
        try {
          const evt = JSON.parse(event.data as string) as { t?: string; total?: number };
          if (evt.t === "order") {
            setToast(`🛒 New order received${typeof evt.total === "number" ? ` · ${money(evt.total)}` : ""}`);
            if (toastTimer.current) clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), 6000);
            void load();
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        es?.close();
        if (!closed) reconnect = setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      closed = true;
      if (reconnect) clearTimeout(reconnect);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      es?.close();
    };
  }, [shopId, load]);

  const cards: { label: string; value: string; accent?: boolean }[] = stats
    ? [
        { label: "Pending orders", value: String(stats.pending), accent: stats.pending > 0 },
        { label: "In progress", value: String(stats.inProgress) },
        { label: "Today's orders", value: String(stats.todayOrders) },
        { label: "Today's sales", value: money(stats.todaySales) },
        { label: "Products", value: String(stats.products) },
        ...(stats.views != null ? [{ label: "Views (30d)", value: String(stats.views) }] : []),
      ]
    : [];

  return (
    <div style={{ marginBottom: 20, fontFamily: "var(--body)" }}>
      {toast && (
        <div style={{
          marginBottom: 12, padding: "12px 16px", borderRadius: 12,
          background: "rgba(15,184,126,.1)", border: "1px solid var(--green)",
          color: "var(--green-deep)", fontSize: 14, fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <span>{toast}</span>
          <Link href={`/shops/manage/${shopId}/orders`} style={{ color: "var(--green-deep)", textDecoration: "underline", fontSize: 13 }}>
            View
          </Link>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)", margin: 0 }}>
          Overview
        </p>
        <Link href={`/shops/manage/${shopId}/orders`} style={{ fontSize: 13, fontWeight: 600, color: "var(--clay)", textDecoration: "none" }}>
          View all orders →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        {!stats
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 14, padding: "16px 18px", height: 74 }} />
            ))
          : cards.map((c) => (
              <div
                key={c.label}
                style={{
                  background: "var(--white)",
                  border: `1px solid ${c.accent ? "var(--clay)" : "var(--line)"}`,
                  borderRadius: 14, padding: "16px 18px",
                }}
              >
                <p style={{ fontSize: 22, fontWeight: 800, color: c.accent ? "var(--clay)" : "var(--ink)", margin: "0 0 2px", lineHeight: 1.1 }}>
                  {c.value}
                </p>
                <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>{c.label}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
