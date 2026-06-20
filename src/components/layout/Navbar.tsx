"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import LanguageSwitcher from "@/components/shared/LanguageSwitcher";
import ThemeToggle from "@/components/shared/ThemeToggle";

/* ─── Logo ───────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--clay)", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 800, color: "var(--white)", lineHeight: 1 }}>X</span>
      </div>
      <span style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 800, letterSpacing: "-.02em", color: "var(--ink)" }}>
        Xplosale
      </span>
    </Link>
  );
}

/* ─── Nav links ──────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { href: "/m",     label: "Marketplace" },
  { href: "/jobs",  label: "Jobs" },
  { href: "/shops", label: "Shops" },
];

/* ─── User dropdown ─────────────────────────────────────────────────────── */
function UserDropdown({ name, image, role }: { name: string; image?: string | null; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          borderRadius: 999,
          border: "1.5px solid var(--line)",
          background: "var(--white)",
          cursor: "pointer",
          color: "var(--ink)",
          fontSize: 14,
          fontWeight: 500,
          fontFamily: "var(--body)",
        }}
      >
        {image ? (
          <Image src={image} alt={name} width={26} height={26} style={{ borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--clay)", display: "grid", placeItems: "center", color: "var(--white)", fontSize: 12, fontWeight: 700 }}>
            {(name ?? "U")[0].toUpperCase()}
          </span>
        )}
        {name.split(" ")[0]}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 180,
            background: "var(--white)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            zIndex: 200,
          }}
        >
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "11px 16px", fontSize: 14, color: "var(--ink)", textDecoration: "none", fontFamily: "var(--body)", fontWeight: 500 }}
          >
            My Profile
          </Link>
          <Link
            href="/shops/manage"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "11px 16px", fontSize: 14, color: "var(--ink-soft)", textDecoration: "none", fontFamily: "var(--body)", fontWeight: 500, borderTop: "1px solid var(--line)" }}
          >
            My Shops
          </Link>
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "11px 16px", fontSize: 14, color: "var(--ink-soft)", textDecoration: "none", fontFamily: "var(--body)", fontWeight: 500, borderTop: "1px solid var(--line)" }}
          >
            Account &amp; Settings
          </Link>
          {role === "PARTNER" && (
            <Link
              href="/partner"
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "11px 16px", fontSize: 14, color: "var(--clay)", textDecoration: "none", fontFamily: "var(--body)", fontWeight: 600, borderTop: "1px solid var(--line)" }}
            >
              Partner Dashboard
            </Link>
          )}
          {role === "ADMIN" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              style={{ display: "block", padding: "11px 16px", fontSize: 14, color: "var(--clay)", textDecoration: "none", fontFamily: "var(--body)", fontWeight: 600, borderTop: "1px solid var(--line)" }}
            >
              Admin Panel
            </Link>
          )}
          <button
            type="button"
            onClick={() => { setOpen(false); void signOut({ callbackUrl: "/" }); }}
            style={{
              display: "block",
              width: "100%",
              padding: "11px 16px",
              fontSize: 14,
              color: "var(--ink-soft)",
              background: "none",
              border: "none",
              borderTop: "1px solid var(--line)",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "var(--body)",
              fontWeight: 500,
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 40);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const user = session?.user as { name?: string; image?: string; role?: string } | undefined;

  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        height: 62,
        background: "var(--white)",
        borderBottom: scrolled ? "1px solid var(--line)" : "1px solid transparent",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: scrolled ? "var(--shadow)" : "none",
        transition: "background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      }}
    >
      <div
        style={{
          maxWidth: "var(--maxw)",
          margin: "0 auto",
          padding: "0 clamp(14px, 4vw, 40px)",
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
        <div style={{ alignItems: "center", gap: 4 }} className="hidden md:flex">
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

        {/* Right — language + auth */}
        <div style={{ alignItems: "center", gap: 10 }} className="hidden md:flex">
          <ThemeToggle />
          <LanguageSwitcher />
          {user ? (
            <>
              <NotificationBell />
              <UserDropdown name={user.name ?? "User"} image={user.image} role={user.role ?? "USER"} />
            </>
          ) : (
            <>
              <Link href="/login" style={{ padding: "8px 18px", borderRadius: 999, border: "1.5px solid var(--line)", fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                Log in
              </Link>
              <Link href="/login" style={{ padding: "8px 18px", borderRadius: 999, background: "var(--ink)", fontSize: 14, fontWeight: 600, color: "var(--paper)", textDecoration: "none" }}>
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          className="flex md:hidden"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--ink)" }}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          style={{ position: "absolute", top: 62, left: 0, right: 0, background: "var(--white)", borderBottom: "1px solid var(--line)", padding: "12px 20px 20px", gap: 4 }}
          className="flex flex-col md:hidden"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              style={{ padding: "10px 14px", borderRadius: 8, fontSize: 15, fontWeight: 500, color: "var(--ink-soft)", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            {user ? (
              <>
                <Link href="/me" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>My Profile</Link>
                <Link href="/shops/manage" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>My Shops</Link>
                <Link href="/me" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", textDecoration: "none" }}>Account &amp; Settings</Link>
                {user.role === "PARTNER" && (
                  <Link href="/partner" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--clay)", textDecoration: "none" }}>Partner Dashboard</Link>
                )}
                {user.role === "ADMIN" && (
                  <Link href="/admin" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--clay)", textDecoration: "none" }}>Admin Panel</Link>
                )}
                <button type="button" onClick={() => { setMobileOpen(false); void signOut({ callbackUrl: "/" }); }}
                  style={{ background: "none", border: "none", textAlign: "left", padding: 0, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", cursor: "pointer", fontFamily: "var(--body)" }}>
                  Sign out
                </button>
              </>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <Link href="/login" onClick={() => setMobileOpen(false)} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>Log in</Link>
                <Link href="/login" onClick={() => setMobileOpen(false)} style={{ padding: "8px 18px", borderRadius: 999, background: "var(--ink)", fontSize: 14, fontWeight: 600, color: "var(--paper)", textDecoration: "none" }}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
