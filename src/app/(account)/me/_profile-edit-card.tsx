"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ProfileEditCardProps {
  name: string | null;
  phone: string | null;
  email: string | null;
  image: string | null;
  secondaryPhone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  city: string | null;
  stateProvince: string | null;
  postcode: string | null;
}

export default function ProfileEditCard({
  name, phone, email, image,
  secondaryPhone, whatsapp, addressLine, city, stateProvince, postcode,
}: ProfileEditCardProps) {
  const router = useRouter();
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: name ?? "",
    phone: phone ?? "",
    secondaryPhone: secondaryPhone ?? "",
    whatsapp: whatsapp ?? "",
    addressLine: addressLine ?? "",
    city: city ?? "",
    stateProvince: stateProvince ?? "",
    postcode: postcode ?? "",
  });
  const [avatarUrl, setAvatarUrl] = useState(image);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/image?purpose=profile_photo", { method: "POST", body: formData });
      const json = (await res.json()) as { ok: boolean; data?: { url: string }; error?: string };
      if (!json.ok || !json.data) {
        setError(json.error ?? "Upload failed");
        return;
      }
      const patchRes = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: json.data.url }),
      });
      const patchJson = (await patchRes.json()) as { ok: boolean; error?: string };
      if (!patchJson.ok) {
        setError(patchJson.error ?? "Failed to save photo");
        return;
      }
      setAvatarUrl(json.data.url);
      await update();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          secondaryPhone: form.secondaryPhone || undefined,
          whatsapp: form.whatsapp || undefined,
          addressLine: form.addressLine || undefined,
          city: form.city || undefined,
          stateProvince: form.stateProvince || undefined,
          postcode: form.postcode || undefined,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Failed to save");
        return;
      }
      setSuccess(true);
      await update();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "24px 28px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
          marginBottom: 16,
        }}
      >
        Your Details
      </p>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--paper-3)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontFamily: "var(--body)", fontSize: 24, color: "var(--ink-faint)" }}>
                {(name ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAvatar(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              fontFamily: "var(--body)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--clay)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
        </div>

        {/* Fields */}
        <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email ?? ""}
              readOnly
              title="Email is tied to your Google sign-in and can't be changed here"
              style={{ ...inputStyle, color: "var(--ink-faint)", background: "var(--paper-2)", cursor: "not-allowed" }}
            />
          </Field>
          <Field label="Additional number">
            <input
              type="tel"
              value={form.secondaryPhone}
              onChange={(e) => setForm((p) => ({ ...p, secondaryPhone: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="WhatsApp number">
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="Address">
            <input
              type="text"
              value={form.addressLine}
              onChange={(e) => setForm((p) => ({ ...p, addressLine: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <div className="x-grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="City">
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                style={inputStyle}
              />
            </Field>
            <Field label="State">
              <input
                type="text"
                value={form.stateProvince}
                onChange={(e) => setForm((p) => ({ ...p, stateProvince: e.target.value }))}
                style={inputStyle}
              />
            </Field>
            <Field label="Postcode">
              <input
                type="text"
                value={form.postcode}
                onChange={(e) => setForm((p) => ({ ...p, postcode: e.target.value }))}
                style={inputStyle}
              />
            </Field>
          </div>

          {error && <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--clay)" }}>{error}</p>}
          {success && !error && (
            <p style={{ fontFamily: "var(--body)", fontSize: 12, color: "var(--green)" }}>Saved.</p>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            style={{
              alignSelf: "flex-start",
              padding: "9px 18px",
              background: "var(--clay)",
              color: "var(--white)",
              fontFamily: "var(--body)",
              fontWeight: 600,
              fontSize: 13,
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line)",
  borderRadius: 10,
  fontFamily: "var(--body)",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--white)",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontFamily: "var(--body)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink-soft)",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
