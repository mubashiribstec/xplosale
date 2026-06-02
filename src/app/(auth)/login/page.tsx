"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

type Tab = "phone" | "google" | "email";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("phone");

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Email magic link state
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setPhoneError("");
    setPhoneLoading(true);
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setPhoneError(data.error ?? "Failed to send OTP");
        return;
      }
      sessionStorage.setItem("otp_phone", phone);
      router.push("/verify");
    } catch {
      setPhoneError("Network error. Please try again.");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/me" });
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await signIn("nodemailer", { email, callbackUrl: "/me", redirect: false });
      if (res?.error) {
        setEmailError("Failed to send magic link. Please try again.");
      } else {
        setEmailSent(true);
      }
    } catch {
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "phone", label: "Phone" },
    { key: "google", label: "Google" },
    { key: "email", label: "Email" },
  ];

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
      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 440,
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
            Sign in to Xplosale
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
            Sell. Hire. Connect. Verified.
          </p>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            background: "var(--paper-2)",
            borderRadius: 12,
            padding: 4,
            gap: 4,
          }}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                borderRadius: 9,
                fontFamily: "var(--body)",
                transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
                background: tab === key ? "var(--white)" : "transparent",
                color: tab === key ? "var(--ink)" : "var(--ink-faint)",
                boxShadow: tab === key ? "var(--shadow)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Phone tab */}
        {tab === "phone" && (
          <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                htmlFor="phone"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}
              >
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                required
                style={{
                  width: "100%",
                  padding: "11px 14px",
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
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
              />
            </div>
            {phoneError && (
              <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{phoneError}</p>
            )}
            <button
              type="submit"
              disabled={phoneLoading || phone.length < 10}
              style={{
                width: "100%",
                padding: "13px 0",
                background: "var(--green)",
                color: "var(--white)",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "var(--body)",
                cursor: phoneLoading || phone.length < 10 ? "not-allowed" : "pointer",
                opacity: phoneLoading || phone.length < 10 ? 0.55 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {phoneLoading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        )}

        {/* Google tab */}
        {tab === "google" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", textAlign: "center", margin: 0 }}>
              Sign in instantly with your Google account.
            </p>
            <button
              onClick={handleGoogleSignIn}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "13px 0",
                background: "var(--white)",
                border: "1.5px solid var(--line)",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "var(--body)",
                color: "var(--ink)",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--white)")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {/* Email tab */}
        {tab === "email" && (
          emailSent ? (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(14,158,110,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="22" height="22" fill="none" stroke="var(--green)" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0 }}>Check your inbox</p>
              <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
                We sent a magic link to <strong style={{ color: "var(--ink)" }}>{email}</strong>. Click it to sign in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="email"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "11px 14px",
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
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--blue)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
                />
              </div>
              {emailError && (
                <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{emailError}</p>
              )}
              <button
                type="submit"
                disabled={emailLoading || !email.includes("@")}
                style={{
                  width: "100%",
                  padding: "13px 0",
                  background: "var(--blue)",
                  color: "var(--white)",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "var(--body)",
                  cursor: emailLoading || !email.includes("@") ? "not-allowed" : "pointer",
                  opacity: emailLoading || !email.includes("@") ? 0.55 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {emailLoading ? "Sending…" : "Send Magic Link"}
              </button>
            </form>
          )
        )}

        {/* Divider + new-user link */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
            New to Xplosale?{" "}
            <Link
              href="/me/verify-identity"
              style={{ color: "var(--green)", fontWeight: 600, textDecoration: "none" }}
            >
              Verify your identity →
            </Link>
          </p>
          <p style={{ fontSize: 11, color: "var(--line)", margin: 0 }}>
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </main>
  );
}
