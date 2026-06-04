"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const POST_LOGIN = "/auth/post-login";

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: POST_LOGIN });
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setPhoneError(data.error ?? "Failed to send code. Check the number and try again.");
        return;
      }
      sessionStorage.setItem("otp_phone", phone.trim());
      router.push("/verify");
    } catch {
      setPhoneError("Network error. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "24px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(32px, 5vw, 48px) clamp(28px, 5vw, 44px)",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            Xplosale
          </Link>
        </div>

        {/* Heading */}
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              margin: "0 0 6px",
              lineHeight: 1.15,
            }}
          >
            Welcome to Xplosale
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
            Sell. Hire. Connect. Verified.
          </p>
        </div>

        {/* Primary — Google */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "14px 0",
              background: "var(--white)",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "var(--body)",
              color: "var(--ink)",
              cursor: googleLoading ? "wait" : "pointer",
              opacity: googleLoading ? 0.7 : 1,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { if (!googleLoading) e.currentTarget.style.background = "var(--paper)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--white)"; }}
          >
            {googleLoading ? (
              <span style={{ fontSize: 14, color: "var(--ink-faint)" }}>Redirecting…</span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
            <span style={{ fontSize: 12, color: "var(--ink-faint)", fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>

          {/* Secondary — Phone OTP toggle */}
          {!phoneOpen ? (
            <button
              onClick={() => setPhoneOpen(true)}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "transparent",
                border: "1.5px solid var(--line)",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--body)",
                color: "var(--ink-soft)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--ink-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.63 11.5 19.79 19.79 0 011.57 2.87 2 2 0 013.56 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 8.54a16 16 0 006.29 6.29l.91-.91a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Sign in with phone number
            </button>
          ) : (
            <form onSubmit={handlePhoneSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label htmlFor="phone" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+92 300 0000000"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    border: "1.5px solid var(--line)",
                    borderRadius: 11,
                    fontSize: 15,
                    fontFamily: "var(--body)",
                    color: "var(--ink)",
                    background: "var(--paper)",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                />
              </div>
              {phoneError && (
                <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{phoneError}</p>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setPhoneOpen(false); setPhoneError(""); setPhone(""); }}
                  style={{
                    flex: "0 0 auto",
                    padding: "11px 16px",
                    background: "transparent",
                    border: "1.5px solid var(--line)",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--ink-soft)",
                    cursor: "pointer",
                    fontFamily: "var(--body)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={phoneLoading || phone.trim().length < 10}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    background: "var(--ink)",
                    color: "var(--white)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--body)",
                    cursor: phoneLoading || phone.trim().length < 10 ? "not-allowed" : "pointer",
                    opacity: phoneLoading || phone.trim().length < 10 ? 0.55 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {phoneLoading ? "Sending…" : "Send code"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0, textAlign: "center" }}>
          By continuing you agree to our{" "}
          <Link href="/terms" style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" style={{ color: "var(--ink-soft)", textDecoration: "underline" }}>Privacy Policy</Link>.
        </p>
      </div>
    </main>
  );
}
