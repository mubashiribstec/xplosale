"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SupportButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const user = session?.user as { id?: string; role?: string } | undefined;
  // Don't show for admins (they ARE support) or unauthenticated users
  if (!user || user.role === "ADMIN") return null;

  async function openSupport() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/support/room", { method: "POST" });
      const json = await res.json() as { ok: boolean; data?: { roomId?: string }; error?: string };
      if (!res.ok || !json.ok) {
        setErrorMsg(json.error ?? "Unable to open support chat. Please try again.");
        return;
      }
      router.push(`/chat/${json.data!.roomId!}`);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      {errorMsg && (
        <div
          style={{
            background: "var(--clay)",
            color: "var(--white)",
            fontSize: 12,
            fontFamily: "var(--body)",
            padding: "8px 14px",
            borderRadius: 10,
            maxWidth: 220,
            textAlign: "right",
            boxShadow: "0 4px 16px rgba(0,0,0,.15)",
          }}
        >
          {errorMsg}
          <button
            onClick={() => setErrorMsg("")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,.7)", cursor: "pointer", marginLeft: 8, padding: 0, fontSize: 14, fontWeight: 700, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
      <button
        onClick={() => void openSupport()}
        disabled={loading}
        aria-label="Contact support"
        style={{
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
        {loading ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" opacity=".3"/>
            <path d="M12 2a10 10 0 0 1 10 10" strokeDasharray="30" strokeDashoffset="30">
              <animate attributeName="stroke-dashoffset" values="30;0" dur=".6s" repeatCount="indefinite"/>
            </path>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
