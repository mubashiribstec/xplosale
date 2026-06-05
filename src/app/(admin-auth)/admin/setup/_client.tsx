"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSetupClient() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
    const data = await res.json() as { error?: string };
    setLoading(false);
    if (res.ok) {
      router.push("/admin/login?setup=1");
    } else {
      setError(data.error ?? "Setup failed. Try again.");
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
          maxWidth: 400,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 18,
          padding: "40px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
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
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            Create Admin Account
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            First-time setup · This page disappears after setup
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Username" value={username} onChange={setUsername} placeholder="e.g. admin" autoComplete="username" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" autoComplete="new-password" />
          <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" autoComplete="new-password" />

          {error && (
            <p style={{ fontSize: 13, color: "#f87171", margin: 0, textAlign: "center" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password || !confirm}
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
              cursor: loading || !username.trim() || !password || !confirm ? "not-allowed" : "pointer",
              opacity: loading || !username.trim() || !password || !confirm ? 0.5 : 1,
              transition: "opacity .15s",
              marginTop: 4,
            }}
          >
            {loading ? "Creating account…" : "Create Admin Account →"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoComplete?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete={autoComplete}
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
  );
}
