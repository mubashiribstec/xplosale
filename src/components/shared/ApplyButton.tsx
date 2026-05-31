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
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-2">
        <p className="text-green-700 font-medium">Application submitted!</p>
        <Link
          href={`/chat/${result.roomId}`}
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          View conversation →
        </Link>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
      >
        Apply Now
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Apply for this job</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover letter <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Tell the employer why you're a great fit..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {error}
                {(error.includes("profile") || error.includes("resume")) && (
                  <Link href="/me/job-seeker" className="block text-blue-600 hover:underline mt-1">
                    Complete your job seeker profile →
                  </Link>
                )}
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
