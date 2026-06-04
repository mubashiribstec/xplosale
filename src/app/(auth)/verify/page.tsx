"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("otp_phone");
    if (!stored) router.replace("/login");
    else setPhone(stored);
  }, [router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        phone,
        otp,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid or expired OTP. Please try again.");
        return;
      }

      sessionStorage.removeItem("otp_phone");
      router.push("/auth/post-login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    setError("");
    try {
      const res = await fetch("/api/auth/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to resend OTP");
        return;
      }
      setResent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
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

        {/* Icon + heading */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(14,158,110,.10)",
              border: "1.5px solid rgba(14,158,110,.24)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "var(--green)" }}>
              <path
                d="M12 1.5L3 6v6c0 5.25 3.75 9.75 9 11 5.25-1.25 9-5.75 9-11V6L12 1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 12l2.5 2.5 4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: 26,
                letterSpacing: "-0.03em",
                color: "var(--ink)",
                margin: "0 0 6px",
                lineHeight: 1.15,
              }}
            >
              Enter your code
            </h1>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
              Sent to{" "}
              <span style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
                {phone || "your phone"}
              </span>
            </p>
          </div>
        </div>

        {/* OTP form */}
        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              htmlFor="otp"
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}
            >
              6-digit code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              required
              autoFocus
              style={{
                width: "100%",
                padding: "14px",
                border: "1.5px solid var(--line)",
                borderRadius: 11,
                fontSize: 28,
                fontFamily: "var(--body)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
                letterSpacing: "0.35em",
                color: "var(--ink)",
                background: "var(--paper)",
                outline: "none",
                boxSizing: "border-box",
                textAlign: "center",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--green)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>
          )}
          {resent && (
            <p style={{ fontSize: 13, color: "var(--green)", margin: 0 }}>Code resent!</p>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
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
              cursor: loading || otp.length !== 6 ? "not-allowed" : "pointer",
              opacity: loading || otp.length !== 6 ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Verifying…" : "Verify code"}
          </button>
        </form>

        {/* Resend + back */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              background: "none",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--green)",
              cursor: resending ? "not-allowed" : "pointer",
              opacity: resending ? 0.55 : 1,
              fontFamily: "var(--body)",
              padding: 0,
            }}
          >
            {resending ? "Resending…" : "Resend code"}
          </button>
          <button
            onClick={() => router.push("/login")}
            style={{
              background: "none",
              border: "none",
              fontSize: 13,
              color: "var(--ink-faint)",
              cursor: "pointer",
              fontFamily: "var(--body)",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back · change phone number
          </button>
        </div>
      </div>
    </main>
  );
}
