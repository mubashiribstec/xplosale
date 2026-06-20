import Link from "next/link";
import { Mail, MessageCircle, Globe } from "lucide-react";

const PRODUCT_LINKS = [
  { label: "Marketplace", href: "/m" },
  { label: "Jobs", href: "/jobs" },
  { label: "Shops", href: "/shops" },
  { label: "Verify identity", href: "/me/verify-identity" },
];

const COMPANY_LINKS = [
  { label: "For Partners", href: "/partner/register" },
  { label: "Guide", href: "/guide" },
  { label: "FAQ", href: "/faq" },
];

const LEGAL_LINKS = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Cookie preferences", href: "/cookies" },
];

const SOCIAL_LINKS = [
  { label: "Email us", href: "mailto:hello@xplosale.com", icon: Mail },
  { label: "WhatsApp", href: "https://wa.me/", icon: MessageCircle },
  { label: "Website", href: "/", icon: Globe },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p
        className="eyebrow"
        style={{ color: "rgba(251,250,245,.4)", margin: 0 }}
      >
        {title}
      </p>
      {links.map(({ label, href }) => (
        <Link
          key={label}
          href={href}
          style={{ fontSize: 14, color: "rgba(251,250,245,.65)", textDecoration: "none" }}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--ink)",
        color: "rgba(251,250,245,.5)",
        padding: "clamp(48px, 6vw, 72px) clamp(20px, 5vw, 80px) clamp(28px, 4vw, 44px)",
      }}
    >
      <div
        className="x-grid-sidebar"
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: "clamp(28px, 4vw, 56px)",
          paddingBottom: "clamp(32px, 4vw, 48px)",
          borderBottom: "1px solid rgba(251,250,245,.1)",
        }}
      >
        {/* Brand column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 320 }}>
          <span
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 22,
              color: "var(--white)",
            }}
          >
            Xplosale
          </span>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(251,250,245,.5)", margin: 0 }}>
            The marketplace where everyone is who they say they are — identity-verified buyers, sellers, employers, and professionals.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(251,250,245,.08)",
                  color: "rgba(251,250,245,.7)",
                }}
              >
                <Icon size={16} strokeWidth={1.8} />
              </Link>
            ))}
          </div>
        </div>

        <FooterColumn title="Product" links={PRODUCT_LINKS} />
        <FooterColumn title="Company" links={COMPANY_LINKS} />
        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      <div
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          paddingTop: "clamp(20px, 3vw, 28px)",
        }}
      >
        <p style={{ fontSize: 12, margin: 0, color: "rgba(251,250,245,.35)" }}>
          &copy; {new Date().getFullYear()} Xplosale. All rights reserved.
        </p>
        <p style={{ fontSize: 12, margin: 0, color: "rgba(251,250,245,.35)" }}>
          Made for buyers, sellers &amp; professionals who value trust.
        </p>
      </div>
    </footer>
  );
}
