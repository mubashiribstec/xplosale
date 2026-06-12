"use client";

import { waChatUrl } from "@/lib/whatsapp";

interface ShopContactActionsProps {
  shopId: string;
  shopName: string;
  contactPhone: string | null;
  website: string | null;
  compact?: boolean;
}

function beacon(shopId: string, kind: "CONTACT_CLICK" | "WEBSITE_CLICK") {
  try {
    const blob = new Blob([JSON.stringify({ kind })], { type: "application/json" });
    navigator.sendBeacon(`/api/shops/${shopId}/track`, blob);
  } catch { /* tracking is best-effort */ }
}

export default function ShopContactActions({ shopId, shopName, contactPhone, website, compact }: ShopContactActionsProps) {
  const wa = contactPhone
    ? waChatUrl(contactPhone, `Hi! I found ${shopName} on Xplosale and I'd like to know more.`)
    : null;

  const base: React.CSSProperties = {
    padding: compact ? "10px 0" : "9px 18px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    fontFamily: "var(--body)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    flex: compact ? 1 : undefined,
    textAlign: "center",
  };

  if (!contactPhone && !website) return null;

  return (
    <>
      {contactPhone && (
        <a
          href={`tel:${contactPhone}`}
          onClick={() => beacon(shopId, "CONTACT_CLICK")}
          style={{ ...base, background: "var(--clay)", color: "var(--white)" }}
        >
          📞 Call
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => beacon(shopId, "CONTACT_CLICK")}
          style={{ ...base, background: "#25D366", color: "#fff" }}
        >
          💬 WhatsApp
        </a>
      )}
      {website && !compact && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => beacon(shopId, "WEBSITE_CLICK")}
          style={{ ...base, background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)" }}
        >
          🌐 Website
        </a>
      )}
    </>
  );
}
