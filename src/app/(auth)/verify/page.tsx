"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

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
      router.push("/me");
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
      const data = await res.json();
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Enter OTP</h1>
        <p className="text-sm text-gray-500 mb-6">
          Sent to <span className="font-medium text-gray-700">{phone}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {resent && <p className="text-sm text-green-600">OTP resent!</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Verifying…" : "Verify OTP"}
          </button>
        </form>

        <button
          onClick={handleResend}
          disabled={resending}
          className="mt-3 w-full text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          {resending ? "Resending…" : "Resend OTP"}
        </button>

        <button
          onClick={() => router.push("/login")}
          className="mt-2 w-full text-sm text-gray-400 hover:underline"
        >
          Change phone number
        </button>
      </div>
    </main>
  );
}
