"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");

    const result = await signIn("admin-credentials", {
      username: username.trim().toLowerCase(),
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError("Invalid username or password.");
      setPassword("");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        padding: "24px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 18,
          padding: "40px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "var(--clay)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 22,
              color: "#f1f5f9",
              margin: "0 0 4px",
              letterSpacing: "-0.02em",
            }}
          >
            Admin Access
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Xplosale · Restricted area
          </p>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoComplete="username"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "#0f172a",
                border: "1.5px solid #334155",
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "var(--body)",
                color: "#f1f5f9",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color .15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#334155")}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{
                width: "100%",
                padding: "11px 14px",
                background: "#0f172a",
                border: "1.5px solid #334155",
                borderRadius: 10,
                fontSize: 14,
                fontFamily: "var(--body)",
                color: "#f1f5f9",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color .15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#334155")}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: "#f87171", margin: 0, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "var(--clay)",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--body)",
              cursor: loading || !username.trim() || !password ? "not-allowed" : "pointer",
              opacity: loading || !username.trim() || !password ? 0.5 : 1,
              transition: "opacity .15s",
              marginTop: 4,
            }}
          >
            {loading ? "Signing in…" : "Sign in to Admin Panel"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
