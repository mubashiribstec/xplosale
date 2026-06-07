"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MessageShopButtonProps {
  shopId: string;
  ownerUserId: string;
  isAuthenticated: boolean;
}

export default function MessageShopButton({ shopId, ownerUserId, isAuthenticated }: MessageShopButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextType: "SHOP_INQUIRY", contextId: shopId, otherUserId: ownerUserId }),
      });
      const json = await res.json() as { ok: boolean; data?: { id: string } };
      if (json.ok && json.data) {
        router.push(`/chat/${json.data.id}`);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      style={{
        padding: "9px 18px",
        background: "transparent",
        color: "var(--ink-soft)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "var(--body)",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      💬 {loading ? "Opening…" : "Message"}
    </button>
  );
}
