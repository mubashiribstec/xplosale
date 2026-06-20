"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ScrollLoginPromptProps {
  isAuthenticated: boolean;
}

export default function ScrollLoginPrompt({ isAuthenticated }: ScrollLoginPromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    try {
      if (sessionStorage.getItem("loginPromptShown")) return;
    } catch { /* storage not available */ }

    const threshold = 0.4;

    function handleScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled / total >= threshold) {
        setVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthenticated]);

  function dismiss() {
    setVisible(false);
    try { sessionStorage.setItem("loginPromptShown", "1"); } catch { /* ignore */ }
  }

  // Close on Escape while the prompt is open.
  useEffect(() => {
    if (!visible) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") dismiss(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join Xplosale"
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 400,
        width: "min(420px, calc(100vw - 32px))",
        background: "var(--white)",
        border: "1.5px solid var(--line)",
        borderRadius: 20,
        boxShadow: "0 8px 40px rgba(0,0,0,.16)",
        padding: "24px 24px 20px",
        fontFamily: "var(--body)",
      }}
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ position: "absolute", top: 14, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: 18, lineHeight: 1 }}
      >
        ✕
      </button>
      <p style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 18, color: "var(--ink)", margin: "0 0 6px" }}>
        Join Xplosale to keep browsing
      </p>
      <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "0 0 18px", lineHeight: 1.5 }}>
        Buy, sell, and connect with verified sellers and employers across Pakistan.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <Link
          href="/login"
          style={{
            flex: 1, textAlign: "center",
            padding: "11px 16px",
            borderRadius: 12,
            border: "1.5px solid var(--line)",
            color: "var(--ink)",
            fontSize: 14, fontWeight: 600,
            textDecoration: "none",
            fontFamily: "var(--body)",
          }}
        >
          Log in
        </Link>
        <Link
          href="/login?tab=register"
          style={{
            flex: 1, textAlign: "center",
            padding: "11px 16px",
            borderRadius: 12,
            background: "var(--clay)",
            color: "var(--white)",
            fontSize: 14, fontWeight: 600,
            textDecoration: "none",
            fontFamily: "var(--body)",
          }}
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
