import Link from "next/link";
import GlobalSearchBar from "@/components/shared/GlobalSearchBar";
import { KhatamPattern, VerificationSeal } from "@/components/ui/XplosaleUI";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GoogleSignInButton from "@/components/shared/GoogleSignInButton";

export default function MarketingHome() {
  return (
    <>
      <Navbar />
    <main style={{ background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--body)", paddingTop: 62 }}>

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
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
            Now verifying in Lahore &middot; Karachi &amp; Islamabad next
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
            <em style={{ fontStyle: "italic", color: "var(--clay)" }}>who they say</em>{" "}
            they are.
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: 520, margin: 0 }}>
            Xplosale verifies every identity with CNIC + biometrics — so buyers, sellers, employers, and professionals can trust each other from day one.
          </p>

          {/* Search bar */}
          <div style={{ maxWidth: 520 }}>
            <GlobalSearchBar placeholder="Search cars, mobiles, property, remote jobs…" />
          </div>

          {/* Quick-link pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { label: "Cars", href: "/m?category=cars" },
              { label: "Mobiles", href: "/m?category=mobiles" },
              { label: "Property", href: "/m?category=property" },
              { label: "Remote jobs", href: "/jobs?remote=true" },
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

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <GoogleSignInButton />
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
          </div>

          {/* Trust line */}
          <p
            className="eyebrow"
            style={{ color: "var(--ink-faint)", margin: 0 }}
          >
            27,418 verified accounts &middot; Lahore
          </p>
        </div>

        {/* Right column — dark hero card */}
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
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
            {/* Big seal visual */}
            <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background: "rgba(14,158,110,.15)",
                  border: "2px solid rgba(14,158,110,.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                  <path
                    d="M28 4L34 18L50 20L39 30L42 46L28 38L14 46L17 30L6 20L22 18L28 4Z"
                    stroke="rgba(14,158,110,0.9)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M19 28L24.5 33.5L37 21"
                    stroke="#16C588"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Label */}
            <div style={{ textAlign: "center" }}>
              <VerificationSeal size={110} />
              <p style={{ fontSize: 13, color: "rgba(251,250,245,.5)", marginTop: 10, margin: "10px 0 0" }}>
                Identity verification powered by NADRA
              </p>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                borderTop: "1px solid rgba(251,250,245,.1)",
                paddingTop: 20,
              }}
            >
              {[
                { val: "27,418", label: "Verified" },
                { val: "94%", label: "Sellers verified" },
                { val: "₨ 4.2cr", label: "Escrow protected" },
                { val: "11,907", label: "Professionals" },
              ].map(({ val, label }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    className="mono"
                    style={{
                      fontFamily: "var(--display)",
                      fontWeight: 800,
                      fontSize: 22,
                      color: "var(--white)",
                      lineHeight: 1,
                    }}
                  >
                    {val}
                  </span>
                  <span style={{ fontSize: 12, color: "rgba(251,250,245,.5)", fontWeight: 500 }}>
                    {label}
                  </span>
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
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "clamp(20px, 3vw, 40px)",
          }}
        >
          {[
            { val: "27,418", label: "Identities verified", sub: "via CNIC + email" },
            { val: "₨ 4.2 cr", label: "Escrow protected", sub: "across live transactions" },
            { val: "94%", label: "Listings from verified sellers", sub: "platform-wide" },
            { val: "11,907", label: "Verified users", sub: "on Xplosale" },
          ].map(({ val, label, sub }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span
                className="mono"
                style={{
                  fontFamily: "var(--display)",
                  fontWeight: 800,
                  fontSize: "clamp(28px, 3.5vw, 44px)",
                  lineHeight: 1,
                  color: "var(--white)",
                }}
              >
                {val}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(251,250,245,.8)", lineHeight: 1.3 }}>
                {label}
              </span>
              <span style={{ fontSize: 12, color: "rgba(251,250,245,.45)" }}>{sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Three Verticals ──────────────────────────────────────────────── */}
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
            One platform. Three trusted verticals.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {[
            {
              num: "01",
              accent: "var(--blue)",
              href: "/m",
              title: "Buy &amp; sell anything.",
              desc: "Post listings, negotiate securely, and complete transactions knowing every counterparty has been verified.",
              metric: "48,200 active listings",
            },
            {
              num: "02",
              accent: "var(--ink)",
              href: "/jobs",
              title: "Verified employers, real roles.",
              desc: "Every job listing comes from a company with a confirmed identity. Apply with confidence.",
              metric: "1,316 open roles",
            },
            {
              num: "03",
              accent: "var(--green)",
              href: "/me/verify-identity",
              title: "Profiles backed by real identity.",
              desc: "Every verified user has submitted identity documents reviewed by our team. Trust the badge.",
              metric: "11,907 verified",
            },
          ].map(({ num, accent, href, title, desc, metric }) => (
            <Link
              key={num}
              href={href}
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
              className="vertical-card"
            >
              {/* top accent bar */}
              <div style={{ height: 4, background: accent }} />
              <div style={{ padding: "28px 28px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <span className="eyebrow" style={{ color: accent }}>
                  {num}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--display)",
                    fontWeight: 800,
                    fontSize: 24,
                    letterSpacing: "-0.02em",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                  dangerouslySetInnerHTML={{ __html: title }}
                />
                <p
                  style={{ fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", margin: 0, flex: 1 }}
                  dangerouslySetInnerHTML={{ __html: desc }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-faint)" }}>{metric}</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                    style={{ color: accent, transition: "transform 0.2s" }}
                  >
                    <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              {/* bottom metric row */}
              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  padding: "12px 28px",
                  background: "var(--paper)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: accent }}>
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="eyebrow" style={{ color: "var(--ink-faint)", fontSize: 11 }}>
                  Live now
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

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
                    title: "CNIC capture",
                    desc: "Upload a photo of your CNIC — we cross-check with NADRA in real time.",
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

            {/* Right: seal visual */}
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
                gap: 24,
              }}
            >
              <KhatamPattern opacity={0.06} />
              <div style={{ position: "relative", zIndex: 1, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: "rgba(14,158,110,.15)",
                    border: "2px solid rgba(14,158,110,.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="46" height="46" viewBox="0 0 56 56" fill="none" aria-hidden="true">
                    <path
                      d="M28 4L34 18L50 20L39 30L42 46L28 38L14 46L17 30L6 20L22 18L28 4Z"
                      stroke="rgba(14,158,110,0.9)"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M19 28L24.5 33.5L37 21"
                      stroke="#16C588"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <VerificationSeal size={80} />
                <p style={{ fontSize: 13, color: "rgba(251,250,245,.5)", margin: 0, maxWidth: 200 }}>
                  Your badge appears on every listing, application, and connection request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "clamp(56px, 7vw, 96px) clamp(20px, 5vw, 80px)",
        }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <p className="eyebrow" style={{ color: "var(--ink-faint)", marginBottom: 12 }}>
            What people say
          </p>
          <h2
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(28px, 3.5vw, 44px)",
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            Trusted by verified users across Pakistan
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {[
            {
              initials: "AK",
              name: "Asad Khan",
              role: "Car dealer · Lahore",
              color: "var(--blue)",
              quote:
                "Finally a platform where I know the buyer is real. Sold my first car within 48 hours — no time-wasters.",
            },
            {
              initials: "SR",
              name: "Sana Rizvi",
              role: "UX Designer · Karachi",
              color: "var(--purple)",
              quote:
                "Got hired through Xplosale Jobs in two weeks. The verification gave the employer confidence that my credentials were legitimate.",
            },
            {
              initials: "FQ",
              name: "Fahad Qureshi",
              role: "Tech Recruiter · Islamabad",
              color: "var(--green)",
              quote:
                "We've screened 300 applications this month. Verified profiles save us hours — we skip straight to the interview.",
            },
          ].map(({ initials, name, role, color, quote }) => (
            <div
              key={name}
              style={{
                background: "var(--white)",
                border: "1px solid var(--line)",
                borderRadius: 20,
                padding: "28px 28px 24px",
                boxShadow: "var(--shadow)",
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--display)",
                  fontStyle: "italic",
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: "var(--ink)",
                  margin: 0,
                  flex: 1,
                }}
              >
                &ldquo;{quote}&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: color,
                    color: "var(--white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{name}</span>
                    <VerifiedBadge size="sm" />
                  </div>
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{role}</span>
                </div>
              </div>
            </div>
          ))}
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
          style={{
            maxWidth: "var(--maxw)",
            margin: "0 auto",
            background: "var(--brand-grad)",
            borderRadius: 24,
            padding: "clamp(40px, 5vw, 64px) clamp(28px, 4vw, 60px)",
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 }}>
              <Link
                href="/me/verify-identity"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--ink)",
                  background: "var(--white)",
                  borderRadius: 12,
                  padding: "14px 30px",
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
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--white)",
                  background: "rgba(251,250,245,.15)",
                  border: "1.5px solid rgba(251,250,245,.3)",
                  borderRadius: 12,
                  padding: "13px 28px",
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
