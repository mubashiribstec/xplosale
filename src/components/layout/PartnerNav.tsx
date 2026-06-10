"use client";

import Link from "next/link";

const NAV = [
  { href: "/partner", label: "Overview" },
  { href: "/partner/listings", label: "Listings" },
  { href: "/partner/jobs", label: "Jobs" },
  { href: "/me", label: "Account" },
];

export default function PartnerNav() {
  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          style={{
            padding: "9px 12px",
            borderRadius: 9,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--ink-soft)",
            textDecoration: "none",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--paper-2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
