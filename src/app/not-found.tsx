import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <p style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 96, color: "var(--clay)", margin: 0, lineHeight: 1 }}>404</p>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 32, color: "var(--ink)", margin: "16px 0 8px" }}>
          Page not found
        </h1>
        <p style={{ fontFamily: "var(--body)", fontSize: 15, color: "var(--ink-soft)", marginBottom: 24 }}>
          This page doesn&apos;t exist or was removed.
        </p>
        <Link href="/" style={{ display: "inline-block", padding: "12px 28px", background: "var(--clay)", color: "var(--white)", borderRadius: 12, fontFamily: "var(--body)", fontWeight: 600, fontSize: 15, textDecoration: "none" }}>
          Go home
        </Link>
      </div>
    </main>
  );
}
