"use client";

import { useState, useEffect, useCallback } from "react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  priceSnapshot: number;
}

interface Order {
  id: string;
  status: string;
  deliveryType: string;
  paymentMethod: string;
  totalAmount: number;
  customerNote: string | null;
  screenshotUrl: string | null;
  createdAt: string;
  customer: { name: string | null; phone: string | null };
  items: OrderItem[];
}

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PAYMENT_SUBMITTED", label: "Payment Sent" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "READY", label: "Ready" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_NEXT: Record<string, { label: string; value: string }[]> = {
  PENDING: [{ label: "Confirm", value: "CONFIRMED" }, { label: "Cancel", value: "CANCELLED" }],
  PAYMENT_SUBMITTED: [{ label: "Confirm Payment & Order", value: "CONFIRMED" }, { label: "Cancel", value: "CANCELLED" }],
  CONFIRMED: [{ label: "Start Preparing", value: "PREPARING" }, { label: "Cancel", value: "CANCELLED" }],
  PREPARING: [{ label: "Mark Ready", value: "READY" }, { label: "Cancel", value: "CANCELLED" }],
  READY: [{ label: "Complete", value: "COMPLETED" }],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  PAYMENT_SUBMITTED: "#7c3aed",
  CONFIRMED: "#2563eb",
  PREPARING: "#0284c7",
  READY: "#059669",
  COMPLETED: "var(--green)",
  CANCELLED: "var(--ink-faint)",
};

const PM_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
};

interface OrdersManagerProps {
  shopId: string;
}

export default function OrdersManager({ shopId }: OrdersManagerProps) {
  const [activeTab, setActiveTab] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = useCallback(async (tab: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (tab) params.set("status", tab);
      const res = await fetch(`/api/shops/${shopId}/orders?${params}`);
      const json = await res.json() as {
        ok: boolean;
        data?: { orders: Order[]; total: number; page: number; pages: number };
      };
      if (json.ok && json.data) {
        setOrders(json.data.orders);
        setTotal(json.data.total);
        setPage(json.data.page);
        setPages(json.data.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchOrders(activeTab, 1); }, [fetchOrders, activeTab]);

  async function updateStatus(orderId: string, status: string) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/shops/${shopId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json() as { ok: boolean; data?: { id: string; status: string } };
      if (json.ok && json.data) {
        setOrders((prev) =>
          prev.map((o) => o.id === orderId ? { ...o, status: json.data!.status } : o)
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-PK", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div style={{ fontFamily: "var(--body)" }}>
      {/* Status tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 12 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: "none", cursor: "pointer",
              background: activeTab === tab.key ? "var(--clay)" : "var(--paper-2)",
              color: activeTab === tab.key ? "var(--white)" : "var(--ink-soft)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "0 0 14px" }}>
        {total} order{total !== 1 ? "s" : ""}{activeTab ? ` · ${STATUS_TABS.find((t) => t.key === activeTab)?.label}` : ""}
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>No orders yet in this category.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((order) => {
            const expanded = expandedId === order.id;
            const nextActions = STATUS_NEXT[order.status] ?? [];
            const isUpdating = updating === order.id;

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--white)", border: "1px solid var(--line)",
                  borderRadius: 14, overflow: "hidden",
                }}
              >
                {/* Order header */}
                <div
                  style={{
                    padding: "14px 16px", cursor: "pointer",
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                  }}
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: "rgba(0,0,0,.06)", color: STATUS_COLOR[order.status] ?? "var(--ink)",
                        letterSpacing: ".04em",
                      }}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                        {order.customer.name ?? "Customer"}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                      {order.deliveryType === "DELIVERY" ? "🚚 Delivery" : "🏪 Pickup"} · {PM_LABEL[order.paymentMethod] ?? order.paymentMethod} · PKR {Number(order.totalAmount).toLocaleString()}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: "2px 0 0" }}>
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <span style={{ fontSize: 18, color: "var(--ink-faint)", flexShrink: 0 }}>
                    {expanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div style={{ borderTop: "1px solid var(--line)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Items */}
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".04em" }}>Items</p>
                      {order.items.map((item) => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>
                          <span>{item.name} × {item.quantity}</span>
                          <span style={{ color: "var(--ink-soft)" }}>PKR {(Number(item.priceSnapshot) * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                        <span>Total</span>
                        <span>PKR {Number(order.totalAmount).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Customer info */}
                    {order.customer.phone && (
                      <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
                        📞 {order.customer.phone}
                      </p>
                    )}

                    {/* Customer note */}
                    {order.customerNote && (
                      <div style={{ background: "var(--paper-2)", borderRadius: 8, padding: "8px 12px" }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 4px" }}>Customer Note</p>
                        <p style={{ fontSize: 13, color: "var(--ink)", margin: 0 }}>{order.customerNote}</p>
                      </div>
                    )}

                    {/* Screenshot */}
                    {order.screenshotUrl && (
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 6px" }}>Payment Screenshot</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.screenshotUrl}
                          alt="Payment screenshot"
                          style={{ maxWidth: 280, borderRadius: 10, border: "1px solid var(--line)" }}
                        />
                      </div>
                    )}

                    {/* Status actions */}
                    {nextActions.length > 0 && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {nextActions.map((action) => (
                          <button
                            key={action.value}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => void updateStatus(order.id, action.value)}
                            style={{
                              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                              border: "none", cursor: isUpdating ? "not-allowed" : "pointer",
                              opacity: isUpdating ? 0.6 : 1,
                              background: action.value === "CANCELLED" ? "rgba(220,38,38,.1)" : "var(--clay)",
                              color: action.value === "CANCELLED" ? "#dc2626" : "var(--white)",
                            }}
                          >
                            {isUpdating ? "Updating…" : action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {page > 1 && (
            <button type="button" onClick={() => void fetchOrders(activeTab, page - 1)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, cursor: "pointer", color: "var(--ink)" }}>
              ← Prev
            </button>
          )}
          {page < pages && (
            <button type="button" onClick={() => void fetchOrders(activeTab, page + 1)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, cursor: "pointer", color: "var(--ink)" }}>
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
