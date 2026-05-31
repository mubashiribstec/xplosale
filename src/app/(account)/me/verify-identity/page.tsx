"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DocType = "CNIC" | "PASSPORT";
type FileSlot = "front" | "back" | "selfie";

const CNIC_SLOTS: { id: FileSlot; label: string; hint: string }[] = [
  { id: "front", label: "CNIC Front", hint: "Clear photo of the front side" },
  { id: "back", label: "CNIC Back", hint: "Clear photo of the back side" },
  { id: "selfie", label: "Selfie with CNIC", hint: "Hold your CNIC next to your face" },
];

const PASSPORT_SLOTS: { id: FileSlot; label: string; hint: string }[] = [
  { id: "front", label: "Passport Photo Page", hint: "The page with your photo, name, and passport number" },
  { id: "selfie", label: "Selfie with Passport", hint: "Hold your passport open next to your face" },
];

export default function VerifyIdentityPage() {
  const router = useRouter();
  const [docType, setDocType] = useState<DocType>("CNIC");
  const [files, setFiles] = useState<Record<FileSlot, File | null>>({ front: null, back: null, selfie: null });
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const slots = docType === "CNIC" ? CNIC_SLOTS : PASSPORT_SLOTS;

  function handleFile(slot: FileSlot, file: File | null) {
    setFiles((prev) => ({ ...prev, [slot]: file }));
  }

  function handleDocTypeChange(dt: DocType) {
    setDocType(dt);
    setFiles({ front: null, back: null, selfie: null });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const required = slots.map((s) => s.id);
    if (required.some((slot) => !files[slot])) {
      setError(`Please select all ${slots.length} images.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      for (const slot of required) {
        const file = files[slot]!;
        const presignRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: slot, contentType: file.type, docType }),
        });
        if (!presignRes.ok) throw new Error(`Failed to get upload URL for ${slot}`);
        const { data: { url } } = await presignRes.json() as { data: { url: string } };

        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error(`Upload failed for ${slot}`);
      }

      const pendingRes = await fetch("/api/account/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType }),
      });
      if (!pendingRes.ok) throw new Error("Failed to submit verification request");

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verification Submitted</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your {docType === "PASSPORT" ? "passport" : "CNIC"} is under review.
            You will be notified once verified (usually within 24 hours).
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            ⚠️ This is a mock verification process. Production requires real identity verification integration.
          </p>
          <button onClick={() => router.push("/me")} className="mt-6 text-sm text-blue-600 hover:underline">
            Back to My Account
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Verify Your Identity</h1>
        <p className="text-sm text-gray-500 mb-6">
          Upload your identity document and a selfie. Images are encrypted and only accessible to admins for review.
        </p>

        {/* Document type toggle */}
        <div className="flex rounded-lg bg-gray-100 p-1 mb-6 gap-1">
          {(["CNIC", "PASSPORT"] as DocType[]).map((dt) => (
            <button
              key={dt}
              type="button"
              onClick={() => handleDocTypeChange(dt)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                docType === dt ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {dt === "CNIC" ? "CNIC (Pakistani)" : "Passport"}
            </button>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-xs text-amber-700">
          ⚠️ <strong>Mock verification:</strong> Images stored for admin review only. Not connected to any government database.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {slots.map((slot) => (
            <div key={slot.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">{slot.label}</p>
              <p className="text-xs text-gray-400 mb-3">{slot.hint}</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFile(slot.id, e.target.files?.[0] ?? null)}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {files[slot.id] && (
                <p className="mt-1 text-xs text-green-600">✓ {files[slot.id]!.name}</p>
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={uploading || slots.some((s) => !files[s.id])}
            className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading…" : "Submit for Verification"}
          </button>
        </form>
      </div>
    </main>
  );
}
