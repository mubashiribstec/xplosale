"use client";

import Link from "next/link";

interface UpgradePromptProps {
  message: string;
  shopId?: string;
}

export default function UpgradePrompt({ message, shopId }: UpgradePromptProps) {
  return (
    <div
      style={{
        background: "rgba(160,78,55,.06)",
        border: "1.5px solid rgba(160,78,55,.22)",
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        fontFamily: "var(--body)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--clay)"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ flexShrink: 0, marginTop: 1 }}
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{message}</p>
      </div>
      {shopId ? (
        <Link
          href={`/shops/manage/${shopId}/upgrade`}
          style={{
            display: "inline-block",
            padding: "8px 16px",
            background: "var(--clay)",
            color: "var(--white)",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            alignSelf: "flex-start",
          }}
        >
          Upgrade to Premium →
        </Link>
      ) : (
        <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
          Create a shop first, then upgrade from the shop dashboard.
        </p>
      )}
    </div>
  );
}
