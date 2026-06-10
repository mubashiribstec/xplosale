"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { ChatThread } from "@/components/shared/ChatThread";
import type { Message } from "@prisma/client";

type MessageWithSender = Message & {
  sender: { id: string; name: string | null };
};

export default function SupportChatWidget() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;

  async function openWidget() {
    setOpen(true);
    if (roomId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/support/room", { method: "POST" });
      const json = (await res.json()) as { ok: boolean; data?: { roomId?: string }; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Unable to open support chat.");
        return;
      }
      const rid = json.data!.roomId!;
      setRoomId(rid);
      const msgRes = await fetch(`/api/chat/rooms/${rid}/messages`);
      const msgJson = (await msgRes.json()) as { ok: boolean; data?: MessageWithSender[] };
      if (msgJson.ok && msgJson.data) {
        setMessages([...msgJson.data].reverse());
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!user || user.role === "ADMIN") return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
      {/* Chat panel */}
      {open && (
        <div
          ref={panelRef}
          style={{
            width: "min(360px, calc(100vw - 32px))",
            height: "min(500px, calc(100vh - 120px))",
            background: "var(--white)",
            border: "1px solid var(--line)",
            borderRadius: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--paper)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--clay)", display: "grid", placeItems: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, color: "var(--ink)", margin: 0 }}>Support</p>
                <p style={{ fontFamily: "var(--body)", fontSize: 11, color: "var(--ink-faint)", margin: 0 }}>Xplosale Team</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: 18, lineHeight: 1, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: "hidden", padding: "12px 16px 16px", display: "flex", flexDirection: "column" }}>
            {!user.id ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <p style={{ fontFamily: "var(--body)", fontSize: 14, color: "var(--ink-soft)", textAlign: "center" }}>Sign in to chat with our support team.</p>
                <a href="/login" style={{ padding: "10px 20px", background: "var(--clay)", color: "var(--white)", borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none", fontFamily: "var(--body)" }}>
                  Log in
                </a>
              </div>
            ) : loading ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-faint)" }}>Connecting…</p>
              </div>
            ) : error ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <p style={{ fontFamily: "var(--body)", fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>{error}</p>
                <button onClick={() => void openWidget()} style={{ padding: "8px 16px", background: "var(--clay)", color: "var(--white)", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: "var(--body)" }}>
                  Retry
                </button>
              </div>
            ) : roomId ? (
              <ChatThread
                roomId={roomId}
                initialMessages={messages}
                currentUserId={user.id}
                contextType="ADMIN_DM"
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { if (!open) void openWidget(); else setOpen(false); }}
        aria-label="Contact support"
        style={{
          width: 52, height: 52,
          borderRadius: "50%",
          background: "var(--clay)",
          border: "none",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,.18)",
          transition: "opacity .2s",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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
