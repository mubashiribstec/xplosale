"use client";

import Link from "next/link";

const LINKS = [
  { label: "Saved Listings", href: "/me/saved-listings" },
  { label: "Favourite Shops", href: "/me/favourite-shops" },
  { label: "Saved jobs", href: "/me/favourite-jobs" },
  { label: "My Orders", href: "/me/orders" },
  { label: "My Shops", href: "/shops/manage" },
  { label: "Job seeker settings", href: "/me/job-seeker" },
  { label: "Listings", href: "/me/listings" },
  { label: "Applications", href: "/me/applications" },
  { label: "Saved searches", href: "/me/saved-searches" },
  { label: "Invites", href: "/me/invites" },
  { label: "Recommendations", href: "/me/job-seeker/recommendations" },
];

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--body)",
  fontSize: 13,
  color: "var(--ink-soft)",
  textDecoration: "none",
  borderBottom: "1px solid transparent",
  transition: "color .15s, border-color .15s",
};

const adminLinkStyle: React.CSSProperties = {
  ...linkStyle,
  color: "var(--clay)",
  fontWeight: 600,
};

export default function QuickLinks({ role }: { role?: string }) {
  const isAdmin = role === "ADMIN";

  function handleMouseOver(e: React.MouseEvent<HTMLAnchorElement>) {
    e.currentTarget.style.color = "var(--clay)";
    e.currentTarget.style.borderBottomColor = "var(--clay)";
  }

  function handleMouseOut(e: React.MouseEvent<HTMLAnchorElement>, isAdminLink = false) {
    e.currentTarget.style.color = isAdminLink ? "var(--clay)" : "var(--ink-soft)";
    e.currentTarget.style.borderBottomColor = "transparent";
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
      {isAdmin && (
        <Link
          href="/admin"
          style={adminLinkStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={(e) => handleMouseOut(e, true)}
        >
          Admin Panel ↗
        </Link>
      )}
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          style={linkStyle}
          onMouseOver={handleMouseOver}
          onMouseOut={(e) => handleMouseOut(e, false)}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
