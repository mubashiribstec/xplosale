import Link from "next/link";

const NAV_LINKS = [
  { label: "Marketplace", href: "/m" },
  { label: "Jobs", href: "/jobs" },
  { label: "For Partners", href: "/partner/register" },
  { label: "Verify identity", href: "/me/verify-identity" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Cookie preferences", href: "/cookies" },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "rgba(251,250,245,.5)",
        padding: "clamp(28px, 4vw, 44px) clamp(20px, 5vw, 80px)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <span
          style={{
            fontFamily: "var(--display)",
            fontWeight: 800,
            fontSize: 18,
            color: "var(--white)",
          }}
        >
          Xplosale
        </span>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{ fontSize: 13, color: "rgba(251,250,245,.5)", textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
          {LEGAL_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              style={{ fontSize: 12, color: "rgba(251,250,245,.35)", textDecoration: "none" }}
            >
              {label}
            </Link>
          ))}
          <p style={{ fontSize: 12, margin: 0, color: "rgba(251,250,245,.35)" }}>
            &copy; {new Date().getFullYear()} Xplosale. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
