"use client";

import Link from "next/link";

const LINKS = [
  { label: "My Profile", href: "/profile" },
  { label: "Job seeker settings", href: "/me/job-seeker" },
  { label: "Listings", href: "/me/listings" },
  { label: "Applications", href: "/me/applications" },
  { label: "Saved searches", href: "/me/saved-searches" },
  { label: "Invites", href: "/me/invites" },
  { label: "Recommendations", href: "/me/job-seeker/recommendations" },
  { label: "Identity verification", href: "/me/verify-identity" },
  { label: "Partner application", href: "/me/partner-application" },
];

export default function QuickLinks() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={{
            fontFamily: "var(--body)",
            fontSize: 13,
            color: "var(--ink-soft)",
            textDecoration: "none",
            borderBottom: "1px solid transparent",
            transition: "color .15s, border-color .15s",
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--clay)";
            (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "var(--clay)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-soft)";
            (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "transparent";
          }}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
