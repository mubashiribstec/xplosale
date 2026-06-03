"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SupportButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!session?.user) return null;

  async function openSupport() {
    setLoading(true);
    try {
      const res = await fetch("/api/support/room", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Unable to open support chat. Try again.");
        return;
      }
      const { roomId } = await res.json();
      router.push(`/chat/${roomId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={openSupport}
      disabled={loading}
      aria-label="Contact support"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 200,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "var(--clay)",
        border: "none",
        cursor: loading ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 16px rgba(0,0,0,.18)",
        transition: "opacity .2s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
