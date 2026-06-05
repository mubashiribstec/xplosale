"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") ?? "";
  const callbackUrl = searchParams.get("callbackUrl") ?? "/auth/post-login";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!phone) { router.replace("/login"); return; }
    inputRef.current?.focus();
  }, [phone, router]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) return;
    setLoading(true);
    setError("");
    const result = await signIn("phone-otp", {
      phone,
      otp,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (result?.ok) {
      router.push(callbackUrl);
    } else {
      setError("Invalid or expired OTP. Please try again.");
      setOtp("");
      inputRef.current?.focus();
    }
  }

  async function handleResend() {
    setResending(true);
    setResendMsg("");
    setError("");
    const res = await fetch("/api/auth/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setResending(false);
    if (res.ok) {
      setResendMsg("New code sent.");
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setResendMsg(data.error ?? "Failed to resend. Try again later.");
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
          maxWidth: 400,
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(32px, 5vw, 48px) clamp(28px, 5vw, 44px)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
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

        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Enter your code
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
            We sent a 6-digit code to{" "}
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{phone}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            style={{
              width: "100%",
              padding: "14px 0",
              border: "1.5px solid var(--line)",
              borderRadius: 12,
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "var(--body)",
              color: "var(--ink)",
              background: "var(--paper)",
              outline: "none",
              textAlign: "center",
              letterSpacing: "0.3em",
              boxSizing: "border-box",
            }}
          />

          {error && (
            <p style={{ fontSize: 13, color: "var(--clay)", margin: 0, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || otp.length < 4}
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
              cursor: loading || otp.length < 4 ? "not-allowed" : "pointer",
              opacity: loading || otp.length < 4 ? 0.55 : 1,
              transition: "opacity .15s",
            }}
          >
            {loading ? "Verifying…" : "Verify & Sign in →"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending}
            style={{ background: "none", border: "none", fontSize: 13, color: "var(--clay)", cursor: "pointer", fontFamily: "var(--body)", padding: 0 }}
          >
            {resending ? "Sending…" : "Resend code"}
          </button>
          {resendMsg && <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>{resendMsg}</p>}
          <Link href="/login" style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none" }}>
            ← Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
