"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const POST_LOGIN = "/auth/post-login";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") ?? POST_LOGIN;

  const [tab, setTab] = useState<"google" | "phone">("google");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl });
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    setSending(true);
    setPhoneError("");
    const res = await fetch("/api/auth/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: trimmed }),
    });
    setSending(false);
    if (res.ok) {
      router.push(`/verify?phone=${encodeURIComponent(trimmed)}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setPhoneError(data.error ?? "Failed to send code. Try again.");
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 0",
    fontFamily: "var(--body)",
    fontSize: 14,
    fontWeight: 600,
    background: active ? "var(--clay)" : "transparent",
    color: active ? "var(--white)" : "var(--ink-soft)",
    border: "none",
    borderRadius: 9,
    cursor: "pointer",
    transition: "all .15s",
  });

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

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--paper)",
            border: "1px solid var(--line)",
            borderRadius: 11,
            padding: 3,
            gap: 3,
          }}
        >
          <button style={tabStyle(tab === "google")} onClick={() => setTab("google")}>Google</button>
          <button style={tabStyle(tab === "phone")} onClick={() => setTab("phone")}>Phone</button>
        </div>

        {/* Google sign-in */}
        {tab === "google" && (
          <button
            onClick={() => void handleGoogleSignIn()}
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
        )}

        {/* Phone OTP */}
        {tab === "phone" && (
          <form onSubmit={(e) => void handleSendOtp(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                required
                style={{
                  width: "100%",
                  padding: "13px 14px",
                  border: "1.5px solid var(--line)",
                  borderRadius: 12,
                  fontSize: 15,
                  fontFamily: "var(--body)",
                  color: "var(--ink)",
                  background: "var(--paper)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              />
            </div>
            {phoneError && (
              <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{phoneError}</p>
            )}
            <button
              type="submit"
              disabled={sending || !phone.trim()}
              style={{
                width: "100%",
                padding: "14px 0",
                background: "var(--clay)",
                color: "var(--white)",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "var(--body)",
                cursor: sending || !phone.trim() ? "not-allowed" : "pointer",
                opacity: sending || !phone.trim() ? 0.55 : 1,
                transition: "opacity .15s",
              }}
            >
              {sending ? "Sending code…" : "Send code →"}
            </button>
          </form>
        )}

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
