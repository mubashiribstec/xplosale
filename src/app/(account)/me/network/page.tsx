"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type NetworkProfile = {
  handle: string;
  headline: string | null;
  summary: string | null;
  currentRole: string | null;
  location: string | null;
  visibility: "PUBLIC" | "CONNECTIONS";
};

export default function NetworkProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<NetworkProfile | null>(null);
  const [form, setForm] = useState({
    handle: "",
    headline: "",
    summary: "",
    currentRole: "",
    location: "",
    visibility: "PUBLIC" as "PUBLIC" | "CONNECTIONS",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: true });

  useEffect(() => {
    fetch("/api/account/profile/network")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            handle: data.handle ?? "",
            headline: data.headline ?? "",
            summary: data.summary ?? "",
            currentRole: data.currentRole ?? "",
            location: data.location ?? "",
            visibility: data.visibility ?? "PUBLIC",
          });
        }
      });
  }, []);

  function set(k: string, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg({ text: "", ok: true });
    const res = await fetch("/api/account/profile/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setProfile(data.data);
      setMsg({ text: "Profile saved!", ok: true });
      setTimeout(() => router.push("/me"), 1200);
    } else {
      setMsg({ text: data.error ?? "Save failed", ok: false });
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 32px)",
        fontFamily: "var(--body)",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button
          onClick={() => router.push("/me")}
          style={{ fontSize: 13, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}
        >
          ← Back
        </button>
        <h1
          style={{
            fontFamily: "var(--display)",
            fontWeight: 800,
            fontSize: 28,
            color: "var(--ink)",
            marginBottom: 24,
          }}
        >
          {profile ? "Edit" : "Set up"} Network Profile
        </h1>
        <form
          onSubmit={handleSave}
          style={{
            background: "var(--white)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: "28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              Handle <span style={{ color: "var(--clay)" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--ink-faint)", pointerEvents: "none" }}>
                @
              </span>
              <input
                required
                type="text"
                value={form.handle}
                onChange={(e) => set("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="your_handle"
                maxLength={30}
                style={{
                  width: "100%",
                  paddingLeft: 28,
                  paddingRight: 14,
                  paddingTop: 10,
                  paddingBottom: 10,
                  border: "1.5px solid var(--line)",
                  borderRadius: 10,
                  fontSize: 14,
                  fontFamily: "var(--body)",
                  color: "var(--ink)",
                  background: "var(--paper)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0 }}>Lowercase letters, numbers, and underscores only. 3–30 characters.</p>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Headline</label>
            <input
              type="text"
              value={form.headline}
              onChange={(e) => set("headline", e.target.value)}
              placeholder="e.g. Full-stack engineer passionate about startups"
              maxLength={160}
              style={inputStyle}
            />
          </div>

          {/* Current Role */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Current Role</label>
            <input
              type="text"
              value={form.currentRole}
              onChange={(e) => set("currentRole", e.target.value)}
              placeholder="e.g. Senior Engineer at Startup"
              maxLength={100}
              style={inputStyle}
            />
          </div>

          {/* Location */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Karachi, Pakistan"
              maxLength={100}
              style={inputStyle}
            />
          </div>

          {/* Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Bio / Summary</label>
            <textarea
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="A short professional summary..."
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 100,
              }}
            />
          </div>

          {/* Visibility */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>Profile Visibility</label>
            <select
              value={form.visibility}
              onChange={(e) => set("visibility", e.target.value)}
              style={inputStyle}
            >
              <option value="PUBLIC">Public — anyone can see your profile</option>
              <option value="CONNECTIONS">Connections only</option>
            </select>
          </div>

          {msg.text && (
            <p style={{ fontSize: 13, color: msg.ok ? "var(--green-deep)" : "var(--clay)", margin: 0 }}>
              {msg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !form.handle}
            style={{
              padding: "12px 0",
              background: "var(--clay)",
              color: "var(--white)",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "var(--body)",
              cursor: saving || !form.handle ? "not-allowed" : "pointer",
              opacity: saving || !form.handle ? 0.55 : 1,
              transition: "opacity .15s",
            }}
          >
            {saving ? "Saving…" : "Save Network Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  fontSize: 14,
  fontFamily: "var(--body)",
  color: "var(--ink)",
  background: "var(--paper)",
  outline: "none",
  boxSizing: "border-box",
};
