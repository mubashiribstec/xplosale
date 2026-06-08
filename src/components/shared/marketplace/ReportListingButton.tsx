"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ReportListingButtonProps {
  listingId: string;
}

const REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "FRAUD", label: "Fraud" },
  { value: "MISLEADING", label: "Misleading" },
  { value: "PROHIBITED", label: "Prohibited content" },
  { value: "DUPLICATE", label: "Duplicate listing" },
  { value: "OTHER", label: "Other" },
] as const;

type Reason = (typeof REASONS)[number]["value"];

export default function ReportListingButton({ listingId }: ReportListingButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("SPAM");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const userId = (session?.user as { id?: string } | undefined)?.id;

  function handleOpen() {
    if (!userId) {
      router.push(`/login?redirect=/m/${listingId}`);
      return;
    }
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setError(null);
    setSuccess(false);
    setReason("SPAM");
    setDetails("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/listings/${listingId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details || undefined }),
      });

      if (res.status === 409) {
        setError("You have already reported this listing.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Failed to submit report. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
      >
        <span>⚑</span>
        <span>Report</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--paper)] rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--ink)]">Report this listing</h2>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {success ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-green-600 font-medium">Report submitted.</p>
                <p className="text-sm text-gray-500">{"We'll review it shortly."}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 px-4 py-2 text-sm bg-[var(--clay)] rounded-lg hover:opacity-80 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-1">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as Reason)}
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-sm bg-[var(--paper)] text-[var(--body)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                  >
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--ink)] mb-1">
                    Details{" "}
                    <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Provide any additional context..."
                    className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-sm bg-[var(--paper)] text-[var(--body)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)] resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{details.length}/500</p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Submitting…" : "Submit report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
