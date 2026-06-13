"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ListingRowActionsProps {
  listingId: string;
  status: string;
}

export default function ListingRowActions({ listingId, status }: ListingRowActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
      else {
        const j = await res.json().catch(() => null) as { error?: string } | null;
        alert(j?.error ?? "Action failed. Please try again.");
      }
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const linkBtn: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, background: "none", border: "none",
    cursor: busy ? "not-allowed" : "pointer", padding: 0, fontFamily: "var(--body)",
    opacity: busy ? 0.5 : 1,
  };

  if (status === "ACTIVE") {
    return (
      <button type="button" disabled={busy} onClick={() => void patch({ status: "SOLD" }, "Mark this listing as sold?")} style={{ ...linkBtn, color: "var(--green)" }}>
        Mark sold
      </button>
    );
  }
  if (status === "SOLD") {
    return (
      <button type="button" disabled={busy} onClick={() => void patch({ status: "ACTIVE" })} style={{ ...linkBtn, color: "var(--clay)" }}>
        Relist
      </button>
    );
  }
  if (status === "EXPIRED") {
    return (
      <button type="button" disabled={busy} onClick={() => void patch({ action: "renew" })} style={{ ...linkBtn, color: "var(--clay)" }}>
        Renew
      </button>
    );
  }
  return null;
}
