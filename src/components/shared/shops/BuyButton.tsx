"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OrderForm from "./OrderForm";

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

interface BuyButtonProps {
  shopId: string;
  product: Product;
  capabilities: ShopCapabilities;
  isAuthenticated: boolean;
}

export default function BuyButton({ shopId, product, capabilities, isAuthenticated }: BuyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  function handleClick() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setOpen(true);
    setOrderId(null);
  }

  function handleSuccess(id: string) {
    setOrderId(id);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        style={{
          padding: "7px 14px",
          background: "var(--clay)",
          color: "var(--white)",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--body)",
          cursor: "pointer",
          width: "100%",
          marginTop: 8,
        }}
      >
        🛒 Buy
      </button>

      {orderId && (
        <div style={{
          marginTop: 8, padding: "8px 10px", background: "rgba(15,184,126,.08)",
          border: "1px solid var(--green)", borderRadius: 8, fontSize: 12,
          color: "var(--green)", fontFamily: "var(--body)",
        }}>
          ✓ Order placed!{" "}
          <button
            type="button"
            onClick={() => router.push("/me/orders")}
            style={{
              background: "none", border: "none", fontSize: 12,
              color: "var(--green)", cursor: "pointer", padding: 0,
              textDecoration: "underline", fontFamily: "var(--body)",
            }}
          >
            View orders
          </button>
        </div>
      )}

      {open && (
        <OrderForm
          shopId={shopId}
          product={product}
          capabilities={capabilities}
          onClose={() => setOpen(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
