"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ReportActionsCellProps {
  reportId: string;
  listingId: string;
}

export default function ReportActionsCell({ reportId, listingId }: ReportActionsCellProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function doAction(action: "dismiss" | "reject_listing") {
    const confirmMsg =
      action === "reject_listing"
        ? "Remove this listing from the marketplace? This cannot be undone."
        : undefined;
    if (confirmMsg && !confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Action failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        disabled={loading}
        onClick={() => void doAction("dismiss")}
        className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
      >
        Dismiss
      </button>
      <a
        href={`/m/${listingId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        View ↗
      </a>
      <button
        type="button"
        disabled={loading}
        onClick={() => void doAction("reject_listing")}
        className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
      >
        Remove Listing
      </button>
    </div>
  );
}
