"use client";

import { useRef, useState } from "react";

interface StorefrontBoardUploaderProps {
  shopId: string;
  currentUrl?: string | null;
  currentImageId?: string | null;
  onUpdate: (image: { id: string; url: string } | null) => void;
}

const MAX_SIZE = 10 * 1024 * 1024;

export default function StorefrontBoardUploader({
  shopId,
  currentUrl,
  currentImageId,
  onUpdate,
}: StorefrontBoardUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [imageId, setImageId] = useState<string | null>(currentImageId ?? null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      setError("File must be under 10 MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "STOREFRONT_BOARD");

      const res = await fetch(`/api/shops/${shopId}/images`, { method: "POST", body: form });
      const json = await res.json() as { ok: boolean; data?: { id: string; url: string }; error?: string };

      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Upload failed");
        return;
      }

      setPreview(json.data.url);
      setImageId(json.data.id);
      onUpdate(json.data);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!imageId) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/shops/${shopId}/images/${imageId}`, { method: "DELETE" });
      const json = await res.json() as { ok: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setError(json.error ?? "Delete failed");
        return;
      }

      setPreview(null);
      setImageId(null);
      onUpdate(null);
    } catch {
      setError("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--body)" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 10px" }}>
        Storefront Photo <span style={{ color: "var(--clay)" }}>*</span>
        <span style={{ fontWeight: 400, color: "var(--ink-faint)", marginLeft: 6 }}>
          Required before submitting. 1 photo, min 600px wide.
        </span>
      </p>

      {preview ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Storefront"
            style={{ width: 160, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={secondaryBtnStyle}
            >
              {uploading ? "Uploading…" : "Replace photo"}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              style={{ ...secondaryBtnStyle, color: "var(--clay)", borderColor: "var(--clay)" }}
            >
              {deleting ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={uploadAreaStyle}
        >
          {uploading ? (
            <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>Uploading…</span>
          ) : (
            <>
              <span style={{ fontSize: 28, marginBottom: 6 }}>📷</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)" }}>
                Upload storefront photo
              </span>
              <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                JPEG, PNG or WebP · max 10 MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
        disabled={uploading}
      />

      {error && (
        <p style={{ fontSize: 12, color: "var(--clay)", margin: "8px 0 0" }}>{error}</p>
      )}
    </div>
  );
}

const secondaryBtnStyle: React.CSSProperties = {
  padding: "7px 14px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink-soft)",
  background: "transparent",
  cursor: "pointer",
  fontFamily: "var(--body)",
};

const uploadAreaStyle: React.CSSProperties = {
  width: "100%",
  padding: "28px 20px",
  border: "1.5px dashed var(--line)",
  borderRadius: 12,
  background: "var(--paper-2)",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--body)",
};
