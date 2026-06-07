"use client";

import { useState, useRef } from "react";

interface Product {
  id: string;
  name: string;
  priceMin: number | null;
}

interface ShopCapabilities {
  acceptsCash: boolean;
  acceptsDelivery: boolean;
  bankName: string | null;
  bankAccountTitle: string | null;
  bankAccountNumber: string | null;
  jazzcashNumber: string | null;
  easipaisaNumber: string | null;
  deliveryNotes: string | null;
}

interface OrderFormProps {
  shopId: string;
  product: Product;
  capabilities: ShopCapabilities;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "JAZZCASH" | "EASYPAISA";
type DeliveryType = "PICKUP" | "DELIVERY";

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

export default function OrderForm({ shopId, product, capabilities, onClose, onSuccess }: OrderFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const availablePayments: PaymentMethod[] = [];
  if (capabilities.bankAccountNumber) availablePayments.push("BANK_TRANSFER");
  if (capabilities.jazzcashNumber) availablePayments.push("JAZZCASH");
  if (capabilities.easipaisaNumber) availablePayments.push("EASYPAISA");
  if (capabilities.acceptsCash) availablePayments.push("CASH");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(availablePayments[0] ?? "CASH");
  const [customerNote, setCustomerNote] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDigitalPayment = paymentMethod !== "CASH";
  const priceEach = product.priceMin ?? 0;
  const total = priceEach * quantity;

  function getPaymentDetails(): React.ReactNode {
    if (paymentMethod === "BANK_TRANSFER" && capabilities.bankAccountNumber) {
      return (
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          {capabilities.bankName && <div><strong>Bank:</strong> {capabilities.bankName}</div>}
          {capabilities.bankAccountTitle && <div><strong>Account Name:</strong> {capabilities.bankAccountTitle}</div>}
          <div><strong>Account Number:</strong> {capabilities.bankAccountNumber}</div>
        </div>
      );
    }
    if (paymentMethod === "JAZZCASH" && capabilities.jazzcashNumber) {
      return <div style={{ fontSize: 13 }}><strong>JazzCash Number:</strong> {capabilities.jazzcashNumber}</div>;
    }
    if (paymentMethod === "EASYPAISA" && capabilities.easipaisaNumber) {
      return <div style={{ fontSize: 13 }}><strong>EasyPaisa Number:</strong> {capabilities.easipaisaNumber}</div>;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (deliveryType === "DELIVERY" && !deliveryAddress.trim())
      return setError("Please enter your delivery address.");
    if (availablePayments.length === 0)
      return setError("This shop has not set up any payment methods yet.");

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ productId: product.id, quantity }],
          deliveryType,
          deliveryAddress: deliveryType === "DELIVERY" ? deliveryAddress : undefined,
          paymentMethod,
          customerNote: customerNote || undefined,
        }),
      });
      const json = await res.json() as { ok: boolean; data?: { id: string }; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Failed to place order. Please try again.");
        return;
      }
      const orderId = json.data.id;

      // Upload screenshot if provided
      if (isDigitalPayment && screenshotFile) {
        const fd = new FormData();
        fd.append("file", screenshotFile);
        const uploadRes = await fetch(`/api/shops/${shopId}/orders/${orderId}/screenshot`, {
          method: "POST",
          body: fd,
        });
        if (!uploadRes.ok) {
          // Non-fatal: order is placed, just screenshot failed
        }
      }

      onSuccess(orderId);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const paymentLabel: Record<PaymentMethod, string> = {
    CASH: "Cash",
    BANK_TRANSFER: "Bank Transfer",
    JAZZCASH: "JazzCash",
    EASYPAISA: "EasyPaisa",
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.55)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "var(--white)", borderRadius: 20, padding: "clamp(20px,4vw,32px)",
        width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto",
        fontFamily: "var(--body)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
            Place Order
          </h2>
          <button
            type="button" onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--ink-faint)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Fraud disclaimer */}
        <div style={{
          background: "rgba(220,38,38,.07)", border: "1px solid rgba(220,38,38,.25)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12,
          color: "#991b1b", lineHeight: 1.5,
        }}>
          ⚠️ <strong>Xplosale is not responsible for any fraud or payment disputes.</strong> This is a direct transaction between buyer and seller. Verify the seller's identity before transferring money.
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Product summary */}
          <div style={{ background: "var(--paper-2)", borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", margin: "0 0 4px" }}>{product.name}</p>
            {priceEach > 0 && (
              <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>
                PKR {priceEach.toLocaleString()} × {quantity} = <strong>PKR {total.toLocaleString()}</strong>
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label style={labelStyle}>Quantity</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 18, cursor: "pointer", color: "var(--ink)" }}>
                −
              </button>
              <span style={{ fontSize: 16, fontWeight: 600, minWidth: 24, textAlign: "center" }}>{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(100, q + 1))}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 18, cursor: "pointer", color: "var(--ink)" }}>
                +
              </button>
            </div>
          </div>

          {/* Delivery type */}
          <div>
            <label style={labelStyle}>Pickup or Delivery</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["PICKUP", "DELIVERY"] as DeliveryType[]).map((type) => {
                const disabled = type === "DELIVERY" && !capabilities.acceptsDelivery;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && setDeliveryType(type)}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: `2px solid ${deliveryType === type ? "var(--clay)" : "var(--line)"}`,
                      background: deliveryType === type ? "rgba(160,78,55,.08)" : "var(--paper)",
                      color: disabled ? "var(--ink-faint)" : deliveryType === type ? "var(--clay)" : "var(--ink)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {type === "PICKUP" ? "🏪 Pickup" : "🚚 Delivery"}
                  </button>
                );
              })}
            </div>
            {deliveryType === "DELIVERY" && capabilities.deliveryNotes && (
              <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "6px 0 0" }}>
                ℹ️ {capabilities.deliveryNotes}
              </p>
            )}
          </div>

          {/* Delivery address */}
          {deliveryType === "DELIVERY" && (
            <div>
              <label style={labelStyle}>Delivery Address</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Full delivery address including city"
                required
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
          )}

          {/* Payment method */}
          <div>
            <label style={labelStyle}>Payment Method</label>
            {availablePayments.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>
                This shop has not set up payment methods yet. Contact them directly.
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {availablePayments.map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: `2px solid ${paymentMethod === pm ? "var(--clay)" : "var(--line)"}`,
                      background: paymentMethod === pm ? "rgba(160,78,55,.08)" : "var(--paper)",
                      color: paymentMethod === pm ? "var(--clay)" : "var(--ink)",
                      cursor: "pointer",
                    }}
                  >
                    {paymentLabel[pm]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payment details + screenshot (non-cash) */}
          {isDigitalPayment && (
            <div style={{ background: "var(--paper-2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", margin: "0 0 8px" }}>
                Transfer PKR {total > 0 ? total.toLocaleString() : "—"} to:
              </p>
              {getPaymentDetails()}
              <div style={{ marginTop: 14 }}>
                <label style={{ ...labelStyle, marginBottom: 8 }}>
                  Upload Payment Screenshot <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(optional but recommended)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] ?? null)}
                  style={{ fontSize: 13, color: "var(--ink-soft)" }}
                />
                {screenshotFile && (
                  <p style={{ fontSize: 12, color: "var(--green)", margin: "6px 0 0" }}>
                    ✓ {screenshotFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Customer note */}
          <div>
            <label style={labelStyle}>Note to Shopkeeper <span style={{ fontWeight: 400, color: "var(--ink-faint)" }}>(optional)</span></label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Any special instructions or questions"
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || availablePayments.length === 0}
            style={{
              padding: "12px 0", background: "var(--clay)", color: "var(--white)",
              border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              fontFamily: "var(--body)", cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Placing Order…" : "Confirm Order"}
          </button>
        </form>
      </div>
    </div>
  );
}
