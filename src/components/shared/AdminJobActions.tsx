"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
  jobTitle: string;
  status: string;
}

export default function AdminJobActions({ jobId, jobTitle, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function postAction(action: "approve" | "pause") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setError(json.error ?? "Failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setError(json.error ?? "Failed");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 justify-end flex-wrap">
      {(status === "DRAFT" || status === "CLOSED") && (
        <button
          type="button"
          onClick={() => void postAction("approve")}
          disabled={loading}
          className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
      )}
      {status === "ACTIVE" && (
        <button
          type="button"
          onClick={() => void postAction("pause")}
          disabled={loading}
          className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded hover:bg-yellow-200 disabled:opacity-50 transition-colors"
        >
          Pause
        </button>
      )}
      {confirmingDelete ? (
        <>
          <span className="text-xs text-gray-500">Delete &quot;{jobTitle}&quot;?</span>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={loading}
            className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="px-2 py-1 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          disabled={loading}
          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
