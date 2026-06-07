"use client";

import { useState } from "react";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  label?: string;
}

export default function ShareButton({ url, title, text, label = "Share" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const fullUrl = `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url: fullUrl, title, text: text ?? title });
        return;
      } catch {
        // Cancelled or not supported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 20,
        border: "1px solid var(--line)",
        background: "var(--white)",
        color: copied ? "var(--green, #16a34a)" : "var(--ink-soft)",
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "var(--body)",
        transition: "all .15s",
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Link copied!
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
