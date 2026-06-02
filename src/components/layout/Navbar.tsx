"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

/* ─── Logo ───────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--clay)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--display)",
            fontSize: 20,
            fontWeight: 800,
            color: "var(--white)",
            lineHeight: 1,
          }}
        >
          X
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--display)",
          fontSize: 19,
          fontWeight: 800,
          letterSpacing: "-.02em",
          color: "var(--ink)",
        }}
      >
        Xplosale
      </span>
    </Link>
  );
}

/* ─── Nav links ──────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/jobs", label: "Jobs" },
  { href: "/network", label: "Network" },
];

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 62,
        background: "var(--white)",
        borderBottom: "1px solid var(--line)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "0 40px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Left — logo */}
        <Logo />

        {/* Center — desktop nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 14.5,
                  fontWeight: 500,
                  color: active ? "var(--clay)" : "var(--ink-soft)",
                  background: active ? "rgba(160,78,55,.08)" : "transparent",
                  textDecoration: "none",
                  transition: "all .2s",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right — auth */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="hidden md:flex">
          {session?.user ? (
            <Link
              href="/profile"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 999,
                border: "1.5px solid var(--line)",
                textDecoration: "none",
                color: "var(--ink)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "avatar"}
                  style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--clay)",
                    display: "grid",
                    placeItems: "center",
                    color: "var(--white)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {(session.user.name ?? "U")[0].toUpperCase()}
                </span>
              )}
              {session.user.name?.split(" ")[0]}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "1.5px solid var(--line)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink)",
                  textDecoration: "none",
                  transition: "all .2s",
                }}
              >
                Log in
              </Link>
              <Link
                href="/register"
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  background: "var(--ink)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--paper)",
                  textDecoration: "none",
                  transition: "all .2s",
                }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex md:hidden"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            color: "var(--ink)",
          }}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          style={{
            position: "absolute",
            top: 62,
            left: 0,
            right: 0,
            background: "var(--white)",
            borderBottom: "1px solid var(--line)",
            padding: "12px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          className="md:hidden"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink-soft)",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 12, display: "flex", gap: 10 }}>
            {session?.user ? (
              <Link href="/profile" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                My Profile
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 999,
                    background: "var(--ink)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--paper)",
                    textDecoration: "none",
                  }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
