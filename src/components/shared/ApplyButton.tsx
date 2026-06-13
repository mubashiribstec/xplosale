"use client";

import { useState } from "react";
import Link from "next/link";

interface ApplyButtonProps {
  jobId: string;
}

type ApplyResult = { applicationId: string; roomId: string };

export default function ApplyButton({ jobId }: ApplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  function openApply() {
    try {
      const blob = new Blob([JSON.stringify({ kind: "APPLY_CLICK" })], { type: "application/json" });
      navigator.sendBeacon(`/api/jobs/${jobId}/track`, blob);
    } catch { /* tracking is best-effort */ }
    setOpen(true);
  }

  async function handleApply() {
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/jobs/${jobId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverLetter: coverLetter || undefined }),
    });

    const json = await res.json() as { ok: boolean; data?: ApplyResult; error?: string };
    setLoading(false);

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Failed to apply");
      return;
    }

    setResult(json.data!);
  }

  if (result) {
    return (
      <div
        className="border rounded-xl p-4 text-center space-y-2"
        style={{ background: "rgba(14,158,110,.08)", borderColor: "rgba(14,158,110,.3)" }}
      >
        <p className="font-medium" style={{ color: "var(--green-deep)" }}>Application submitted!</p>
        <Link
          href={`/chat/${result.roomId}`}
          className="inline-block text-sm hover:underline"
          style={{ color: "var(--blue)" }}
        >
          View conversation →
        </Link>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={openApply}
        className="px-6 py-2.5 font-semibold rounded-xl transition-colors"
        style={{ background: "var(--clay)", color: "var(--white)" }}
      >
        Apply Now
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>Apply for this job</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xl leading-none transition-colors"
                style={{ color: "var(--ink-faint)" }}
              >
                &times;
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>
                Cover letter <span className="font-normal" style={{ color: "var(--ink-faint)" }}>(optional)</span>
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Tell the employer why you're a great fit..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{ borderColor: "var(--line)" }}
              />
            </div>

            {error && (
              <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}>
                {error}
                {(error.includes("profile") || error.includes("resume")) && (
                  <Link href="/me/job-seeker" className="block hover:underline mt-1" style={{ color: "var(--blue)" }}>
                    Complete your job seeker profile →
                  </Link>
                )}
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={loading}
              className="w-full py-2.5 font-semibold rounded-xl disabled:opacity-50 transition-colors"
              style={{ background: "var(--clay)", color: "var(--white)" }}
            >
              {loading ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
