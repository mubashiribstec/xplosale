import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UpgradeCancelPage({ params }: PageProps) {
  const { id: shopId } = await params;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ maxWidth: 420, width: "100%", textAlign: "center", fontFamily: "var(--body)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>↩</div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(20px,4vw,28px)", color: "var(--ink)", margin: "0 0 10px" }}>
          Upgrade Cancelled
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 28px" }}>
          No payment was made. You can upgrade to Premium anytime.
        </p>
        <Link
          href={`/shops/manage/${shopId}/upgrade`}
          style={{
            display: "inline-block", padding: "11px 24px",
            background: "var(--clay)", color: "var(--white)",
            borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
