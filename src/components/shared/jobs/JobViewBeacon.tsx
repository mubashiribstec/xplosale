"use client";

import { useEffect } from "react";

/** Fires a best-effort VIEW analytics beacon once on mount. Premium employers only (gated server-side). */
export default function JobViewBeacon({ jobId }: { jobId: string }) {
  useEffect(() => {
    try {
      const blob = new Blob([JSON.stringify({ kind: "VIEW" })], { type: "application/json" });
      navigator.sendBeacon(`/api/jobs/${jobId}/track`, blob);
    } catch { /* tracking is best-effort */ }
  }, [jobId]);

  return null;
}
