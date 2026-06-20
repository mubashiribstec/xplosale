import type { Metadata } from "next";
import Link from "next/link";
import GlobalSearchBar from "@/components/shared/GlobalSearchBar";
import { KhatamPattern, VerificationSeal, TrustGauge } from "@/components/ui/XplosaleUI";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Reveal from "@/components/marketing/Reveal";
import CountUp from "@/components/marketing/CountUp";
import MarketplacePreview from "@/components/marketing/MarketplacePreview";
import JobsPreview from "@/components/marketing/JobsPreview";
import { prisma } from "@/lib/prisma";
import { serializeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Xplosale — The marketplace where everyone is who they say they are",
  description:
    "Identity-verified marketplace, jobs, and local shops. Buy, sell, hire, apply, and shop with confidence — every account is reviewed by our team.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Xplosale — Identity-verified marketplace, jobs & shops",
    description: "Buy, sell, hire, apply, and shop with confidence — every account is reviewed by our team.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Xplosale", description: "Identity-verified marketplace, jobs, and shops." },
};

export default async function MarketingHome() {
  const [verifiedCount, activeListings, activeJobs, activeShops] = await Promise.all([
    prisma.user.count({ where: { hasVerifiedBadge: true } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.jobPosting.count({ where: { status: "ACTIVE" } }),
    prisma.shop.count({ where: { status: "ACTIVE" } }),
  ]);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Xplosale",
    url: "https://xplosale.com",
    description: "Identity-verified marketplace, jobs, and shops platform.",
  };
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Xplosale",
    url: "https://xplosale.com",
  };

  // Public sections — every visitor is funnelled into all three.
  const sections = [
    {
      num: "01",
      href: "/m",
      color: "var(--blue)",
      title: "Buy & sell anything.",
      desc: "Post listings, negotiate, and pay through escrow — every counterparty is identity-verified, so no scams and no time-wasters.",
      stat: activeListings > 0 ? `${activeListings.toLocaleString()} active listings` : "Post the first listing",
      cta: "Browse marketplace",
    },
    {
      num: "02",
      href: "/jobs",
      color: "var(--ink)",
      title: "Real jobs, real employers.",
      desc: "Every role comes from a company with a confirmed identity. Apply with confidence — no ghost postings, no fake recruiters.",
      stat: activeJobs > 0 ? `${activeJobs.toLocaleString()} open roles` : "Post the first job",
      cta: "Find jobs",
    },
    {
      num: "03",
      href: "/shops",
      color: "var(--clay)",
      title: "Discover local shops.",
      desc: "Order from verified local storefronts and pay your way — cash, JazzCash, EasyPaisa, or bank. Your neighbourhood, online.",
      stat: activeShops > 0 ? `${activeShops.toLocaleString()} shops open` : "Open the first shop",
      cta: "Explore shops",
    },
  ];

  // The problems Xplosale exists to solve.
  const problems = [
    {
      color: "var(--clay)",
      title: "No more fake accounts",
      desc: "Every identity document is reviewed by a real person before a badge is issued — you always know who you're dealing with.",
      icon: (
        <path d="M8 1.5L2 4v4c0 3.3 2.5 6.2 6 7 3.5-.8 6-3.7 6-7V4L8 1.5z M5.5 8l1.8 1.8 3.2-3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
    {
      color: "var(--blue)",
      title: "No scams or ghost listings",
      desc: "Sellers, employers, and shopkeepers are verified, so listings and roles are real — not bait from anonymous accounts.",
      icon: (
        <path d="M8 1.5l5.5 2v3.2c0 3.4-2.3 6.5-5.5 7.3-3.2-.8-5.5-3.9-5.5-7.3V3.5L8 1.5z M8 5v3.5 M8 11h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
    {
      color: "var(--green)",
      title: "Safer payments with escrow",
      desc: "Marketplace payments are held in escrow and released only when both sides are happy — your money is protected end to end.",
      icon: (
        <path d="M2.5 5.5h11v7h-11z M2.5 8h11 M5 10.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      ),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([orgJsonLd, siteJsonLd]) }}
      />
      <noscript>
        Xplosale is an identity-verified marketplace, jobs, and shops platform. Enable JavaScript for the full experience.
      </noscript>

      <Navbar />
    <main style={{ background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--body)", paddingTop: 62 }}>

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="x-grid-2col"
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "clamp(48px, 8vw, 100px) clamp(20px, 5vw, 80px) clamp(60px, 8vw, 100px)",
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: "clamp(32px, 5vw, 80px)",
          alignItems: "center",
        }}
      >
        {/* Left column */}
        <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Pill badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(14,158,110,.10)",
              border: "1px solid rgba(14,158,110,.24)",
              color: "var(--green-deep)",
              borderRadius: 999,
              padding: "6px 14px 6px 10px",
              fontSize: 13,
              fontWeight: 600,
              alignSelf: "flex-start",
            }}
          >
            {/* Shield icon */}
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L2 4v4c0 3.3 2.5 6.2 6 7 3.5-.8 6-3.7 6-7V4L8 1.5z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path d="M5.5 8l1.8 1.8 3.2-3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Now live &middot; Identity-verified marketplace worldwide
          </div>

          {/* H1 */}
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(46px, 6.5vw, 88px)",
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              color: "var(--ink)",
              margin: 0,
            }}
          >
            The marketplace where everyone is{" "}
            <em
              style={{
                fontStyle: "italic",
                fontWeight: 800,
                color: "var(--clay)",
                textDecoration: "underline",
                textDecorationColor: "rgba(160,78,55,.35)",
                textDecorationThickness: 4,
                textUnderlineOffset: 8,
              }}
            >
              who they say
            </em>{" "}
            they are.
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 540, margin: 0 }}>
            Buy &amp; sell, find jobs, and shop local — with one verified identity that everyone can trust.
            We review every account by hand, so you always know who&apos;s on the other side.
          </p>

          {/* Search bar */}
          <div style={{ maxWidth: 540, borderRadius: 16, boxShadow: "var(--shadow)" }}>
            <GlobalSearchBar placeholder="Search cars, mobiles, jobs, local shops…" />
          </div>

          {/* Quick-link pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Cars", href: "/m?category=cars" },
              { label: "Mobiles", href: "/m?category=mobiles" },
              { label: "Property", href: "/m?category=property" },
              { label: "Remote jobs", href: "/jobs?remote=true" },
              { label: "Shops", href: "/shops" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  background: "var(--paper-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 99,
                  padding: "5px 14px",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* CTAs — no third-party sign-in on the landing page */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <Link
              href="/me/verify-identity"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--white)",
                background: "var(--green)",
                borderRadius: 12,
                padding: "14px 28px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Get verified — it&apos;s free
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/m"
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--ink)",
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: 12,
                padding: "13px 26px",
                textDecoration: "none",
              }}
            >
              Explore marketplace
            </Link>
          </div>

          {/* Trust chip */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>
              {["#327AD6", "#A04E37", "#0E9E6E"].map((c, i) => (
                <span
                  key={c}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c,
                    border: "2px solid var(--paper)",
                    marginLeft: i === 0 ? 0 : -8,
                  }}
                />
              ))}
            </div>
            <p className="eyebrow" style={{ color: "var(--ink-faint)", margin: 0 }}>
              {verifiedCount > 0 ? `${verifiedCount.toLocaleString()} verified accounts` : "Be the first verified account"}
            </p>
          </div>
        </div>

        {/* Right column — dark verification showcase card */}
        <div
          className="reveal"
          style={{
            background: "var(--ink)",
            borderRadius: 24,
            padding: "clamp(28px, 4vw, 44px)",
            position: "relative",
            overflow: "hidden",
            color: "var(--white)",
            animationDelay: "0.18s",
          }}
        >
          <KhatamPattern opacity={0.07} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Seal */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
              <VerificationSeal size={104} />
            </div>

            {/* Mock verified profile chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "rgba(251,250,245,.06)",
                border: "1px solid rgba(251,250,245,.12)",
                borderRadius: 16,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--clay)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--white)",
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                AK
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--white)" }}>Verified seller</span>
                  <VerifiedBadge size="sm" />
                </div>
                <span style={{ fontSize: 12, color: "rgba(251,250,245,.5)" }}>Documents reviewed by our team</span>
              </div>
              <div style={{ flexShrink: 0 }}>
                <TrustGauge value={92} size={56} stroke={5} />
              </div>
            </div>

            {/* Micro trust points */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Government ID checked by a human reviewer",
                "Trust score visible on every transaction",
                "Escrow protection on marketplace payments",
              ].map((point) => (
                <div key={point} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ marginTop: 2, flexShrink: 0, color: "var(--green-bright)" }}>
                    <path d="M3 8.5l3.2 3.2L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 13, color: "rgba(251,250,245,.7)", lineHeight: 1.5 }}>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Stats Bar ──────────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--ink)",
          color: "var(--white)",
          padding: "clamp(28px, 4vw, 48px) clamp(20px, 5vw, 80px)",
        }}
      >
        <div
          className="x-grid-4col"
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(20px, 3vw, 40px)",
          }}
        >
          {[
            { value: verifiedCount, label: "Identities verified", sub: "documents reviewed by our team", zero: "Just launched" },
            { value: activeListings, label: "Active listings", sub: "on the marketplace", zero: "Post yours first" },
            { value: activeJobs, label: "Open roles", sub: "hiring now", zero: "Post the first job" },
            { value: activeShops, label: "Shops open", sub: "ready to take orders", zero: "Open the first shop" },
          ].map(({ value, label, sub, zero }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {value === 0 ? (
                <span
                  className="mono"
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 800,
                    fontSize: "clamp(22px, 2.8vw, 32px)",
                    lineHeight: 1,
                    color: "var(--white)",
                  }}
                >
                  {zero}
                </span>
              ) : (
                <CountUp
                  value={value}
                  className="mono"
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 800,
                    fontSize: "clamp(28px, 3.5vw, 44px)",
                    lineHeight: 1,
                    color: "var(--white)",
                  }}
                />
              )}
              <span
                style={{ fontSize: 14, fontWeight: 600, color: "rgba(251,250,245,.8)", lineHeight: 1.3 }}
                aria-label={value > 0 ? `${value.toLocaleString()} ${label.toLowerCase()}` : undefined}
              >
                {label}
              </span>
              <span style={{ fontSize: 12, color: "rgba(251,250,245,.45)" }}>{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Explore every section ────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
        }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <p className="eyebrow" style={{ color: "var(--ink-faint)", marginBottom: 12 }}>
            What you can do
          </p>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(32px, 4.5vw, 54px)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Three ways to use your verified identity.
          </h2>
        </div>

        <div
          className="x-grid-3col stagger"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {sections.map(({ num, href, color, title, desc, stat, cta }) => (
            <Link
              key={num}
              href={href}
              className="vertical-card"
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 20,
                overflow: "hidden",
                textDecoration: "none",
                color: "var(--ink)",
                display: "flex",
                flexDirection: "column",
                boxShadow: "var(--shadow)",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}
            >
              <div className="vertical-card-bar" style={{ height: 4, background: color, transition: "filter 0.2s" }} />
              <div style={{ padding: "28px 28px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <span className="eyebrow" style={{ color }}>{num}</span>
                <h3 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
                  {title}
                </h3>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0, flex: 1 }}>
                  {desc}
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>
                    {cta}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="vertical-card-arrow" style={{ color }}>
                    <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-faint)" }}>{stat}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Problems we solve ────────────────────────────────────────────── */}
      <section
        style={{
          background: "var(--paper-2)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
        }}
      >
        <div style={{ maxWidth: "var(--maxw)", margin: "0 auto" }}>
          <Reveal>
            <div style={{ marginBottom: 40, textAlign: "center" }}>
              <p className="eyebrow" style={{ color: "var(--clay)", marginBottom: 12 }}>
                Why Xplosale
              </p>
              <h2
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: "clamp(28px, 3.5vw, 44px)",
                  letterSpacing: "-0.03em",
                  margin: "0 auto",
                  maxWidth: 720,
                  lineHeight: 1.15,
                }}
              >
                Online deals are full of strangers. We fix that.
              </h2>
            </div>
          </Reveal>

          <div
            className="x-grid-3col"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
          >
            {problems.map(({ color, title, desc, icon }, i) => (
              <Reveal key={title} delay={i * 0.08}>
                <div
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--line)",
                    borderRadius: 20,
                    padding: "28px 26px",
                    boxShadow: "var(--shadow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--paper-2)",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      {icon}
                    </svg>
                  </div>
                  <h3 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em", margin: 0, lineHeight: 1.25 }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0 }}>
                    {desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Marketplace Preview ──────────────────────────────────────────── */}
      <MarketplacePreview />

      {/* ─── Jobs Preview ──────────────────────────────────────────────────── */}
      <JobsPreview />

      {/* ─── How Verification Works ───────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          background: "var(--paper-2)",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            background: "var(--white)",
            borderRadius: 24,
            boxShadow: "var(--shadow)",
            border: "1px solid var(--line)",
            overflow: "hidden",
          }}
        >
          <div
            className="x-grid-2col"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
            }}
          >
            {/* Left: steps */}
            <div style={{ padding: "clamp(32px, 4vw, 56px)" }}>
              <p className="eyebrow" style={{ color: "var(--green)", marginBottom: 14 }}>
                Verification
              </p>
              <h2
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: "clamp(28px, 3.5vw, 44px)",
                  letterSpacing: "-0.03em",
                  margin: "0 0 32px",
                  lineHeight: 1.15,
                }}
              >
                How we verify every identity
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    num: "01",
                    title: "Email verification",
                    desc: "Confirm your email address to create a base layer of accountability.",
                  },
                  {
                    num: "02",
                    title: "Document upload",
                    desc: "Upload a photo of your CNIC or passport — our team reviews it manually.",
                  },
                  {
                    num: "03",
                    title: "Trust score issued",
                    desc: "Once verified, your profile carries a public trust score visible to everyone you transact with.",
                  },
                ].map(({ num, title, desc }) => (
                  <div
                    key={num}
                    style={{
                      display: "flex",
                      gap: 16,
                      padding: "18px 20px",
                      background: "var(--paper)",
                      borderRadius: 14,
                      border: "1px solid var(--line)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--display)",
                        fontWeight: 800,
                        fontSize: 13,
                        color: "var(--green)",
                        minWidth: 28,
                        paddingTop: 2,
                      }}
                    >
                      {num}
                    </span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, margin: "0 0 4px", color: "var(--ink)" }}>
                        {title}
                      </p>
                      <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55, margin: 0 }}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/me/verify-identity"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 28,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--white)",
                  background: "var(--green)",
                  borderRadius: 12,
                  padding: "13px 26px",
                  textDecoration: "none",
                }}
              >
                Start verification
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Right: composed seal + step indicator visual */}
            <div
              style={{
                background: "var(--ink)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "clamp(32px, 4vw, 56px)",
                position: "relative",
                overflow: "hidden",
                gap: 28,
              }}
            >
              <KhatamPattern opacity={0.06} />
              <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
                <VerificationSeal size={100} />

                {/* Step indicator dots mirroring the left steps */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {["Email", "Documents", "Trust score"].map((label) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        className="verify-step-dot"
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "var(--green-bright)",
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontSize: 11, color: "rgba(251,250,245,.55)", fontWeight: 600 }}>{label}</span>
                    </div>
                  ))}
                </div>

                <p style={{ fontSize: 13, color: "rgba(251,250,245,.5)", margin: 0, maxWidth: 220 }}>
                  Your badge appears on every listing, application, and connection request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Band ─────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "clamp(40px, 5vw, 60px) clamp(20px, 5vw, 80px)",
          background: "var(--paper-2)",
          borderTop: "1px solid var(--line)",
        }}
      >
        <div
          className="cta-gradient"
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            background: "var(--brand-grad)",
            borderRadius: 24,
            padding: "clamp(44px, 6vw, 72px) clamp(28px, 4vw, 60px)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <KhatamPattern opacity={0.08} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            <p className="eyebrow" style={{ color: "rgba(251,250,245,.7)" }}>
              Join Xplosale
            </p>
            <h2
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: "clamp(30px, 4vw, 52px)",
                letterSpacing: "-0.03em",
                color: "var(--white)",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Your verified identity is your advantage.
            </h2>
            <p style={{ fontSize: 17, color: "rgba(251,250,245,.75)", maxWidth: 480, margin: 0, lineHeight: 1.6 }}>
              Every transaction is safer when both sides are verified. Create your account and get your badge today — free, forever.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 10 }}>
              <Link
                href="/me/verify-identity"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--ink)",
                  background: "var(--white)",
                  borderRadius: 14,
                  padding: "16px 34px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Create verified account
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/m"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--white)",
                  background: "rgba(251,250,245,.15)",
                  border: "1.5px solid rgba(251,250,245,.3)",
                  borderRadius: 14,
                  padding: "15px 32px",
                  textDecoration: "none",
                }}
              >
                Explore first
              </Link>
            </div>
          </div>
        </div>
      </section>

    </main>
      <Footer />
    </>
  );
}
