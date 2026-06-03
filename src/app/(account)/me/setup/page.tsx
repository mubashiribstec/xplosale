"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type AccountType = "SELLER" | "JOB_SEEKER" | "EMPLOYER" | "NETWORKER";

const ACCOUNT_TYPES: { key: AccountType; label: string; desc: string; icon: string }[] = [
  { key: "SELLER", label: "Seller / Buyer", desc: "List items, property, or vehicles for sale", icon: "🛒" },
  { key: "JOB_SEEKER", label: "Job Seeker", desc: "Find jobs and apply to employers", icon: "💼" },
  { key: "EMPLOYER", label: "Employer / Recruiter", desc: "Post jobs and hire talent", icon: "🏢" },
  { key: "NETWORKER", label: "Professional", desc: "Build your network and brand", icon: "🤝" },
];

export default function SetupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState((session?.user?.name as string) ?? "");
  const [selected, setSelected] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/account/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), accountType: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push("/me");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
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
          maxWidth: 520,
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
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Welcome to Xplosale
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
            Tell us a bit about yourself to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
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
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--clay)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            />
          </div>

          {/* Account type */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              I want to…
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ACCOUNT_TYPES.map(({ key, label, desc, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  style={{
                    padding: "14px 12px",
                    border: selected === key ? "2px solid var(--clay)" : "1.5px solid var(--line)",
                    borderRadius: 14,
                    background: selected === key ? "rgba(160,78,55,.06)" : "var(--white)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all .15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{label}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.3 }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !selected || name.trim().length < 2}
            style={{
              width: "100%",
              padding: "13px 0",
              background: "var(--clay)",
              color: "var(--white)",
              border: "none",
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "var(--body)",
              cursor: loading || !selected || name.trim().length < 2 ? "not-allowed" : "pointer",
              opacity: loading || !selected || name.trim().length < 2 ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Setting up…" : "Continue →"}
          </button>
        </form>
      </div>
    </main>
  );
}
