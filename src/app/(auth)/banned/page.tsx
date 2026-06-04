import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Suspended | Xplosale",
  robots: { index: false, follow: false },
};

export default function BannedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "24px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(32px, 5vw, 48px) clamp(28px, 5vw, 44px)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1 }}>🚫</div>

        <div>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 26,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            Account Suspended
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
            Your account has been suspended due to a violation of our{" "}
            <Link href="/terms" style={{ color: "var(--clay)", textDecoration: "underline" }}>
              Terms of Service
            </Link>
            . If you believe this is an error, please contact support.
          </p>
        </div>

        <a
          href="mailto:support@xplosale.com"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--clay)",
            color: "#fff",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Contact Support
        </a>

        <Link
          href="/"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "underline" }}
        >
          Return to homepage
        </Link>
      </div>
    </main>
  );
}
