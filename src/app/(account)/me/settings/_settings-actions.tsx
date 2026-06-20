"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ur", label: "اردو (Urdu)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
];

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: "24px 28px",
  fontFamily: "var(--body)",
};

export default function SettingsActions({ initialLocale }: { initialLocale: string }) {
  const [locale, setLocale] = useState(initialLocale);
  const [langSaved, setLangSaved] = useState(false);
  const [langSaving, setLangSaving] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function changeLanguage(next: string) {
    setLocale(next);
    setLangSaving(true);
    setLangSaved(false);
    try {
      const res = await fetch("/api/account/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (res.ok) {
        setLangSaved(true);
        setTimeout(() => setLangSaved(false), 2500);
      }
    } finally {
      setLangSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setDeleteError(json.error ?? "Could not delete your account.");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Language */}
      <div style={cardStyle}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 14px" }}>
          Language
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select
            value={locale}
            onChange={(e) => void changeLanguage(e.target.value)}
            disabled={langSaving}
            style={{
              border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px",
              fontSize: 14, fontFamily: "var(--body)", background: "var(--white)", color: "var(--ink)",
              minWidth: 200,
            }}
          >
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          {langSaved && <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>✓ Saved</span>}
        </div>
      </div>

      {/* Session */}
      <div style={cardStyle}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 6px" }}>
          Session
        </p>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "0 0 14px" }}>Sign out of your account on this device.</p>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: "/" })}
          style={{
            padding: "10px 22px", background: "var(--ink)", color: "var(--white)", border: "none",
            borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "var(--body)", cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>

      {/* Danger zone */}
      <div style={{ ...cardStyle, border: "1px solid rgba(220,38,38,.25)" }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#dc2626", margin: "0 0 4px" }}>Delete account</p>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "0 0 14px", lineHeight: 1.6 }}>
          Permanently delete your account and all associated data — listings, shops, orders, applications, and messages.
          This cannot be undone. Type <strong>DELETE</strong> to confirm.
        </p>
        {deleteError && <p style={{ fontSize: 13, color: "var(--clay)", margin: "0 0 10px" }}>{deleteError}</p>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            style={{
              border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px",
              fontSize: 14, fontFamily: "var(--body)", width: 140,
            }}
          />
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting || confirmText !== "DELETE"}
            style={{
              padding: "10px 22px",
              background: confirmText === "DELETE" ? "#dc2626" : "transparent",
              color: confirmText === "DELETE" ? "var(--white)" : "#dc2626",
              border: "1px solid #dc2626", borderRadius: 10, fontSize: 14, fontWeight: 600,
              fontFamily: "var(--body)", cursor: (deleting || confirmText !== "DELETE") ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  );
}
