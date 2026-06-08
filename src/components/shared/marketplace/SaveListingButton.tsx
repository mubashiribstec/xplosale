"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SaveListingButtonProps {
  listingId: string;
  initialSaved: boolean;
  initialCount: number;
  sellerUserId: string;
}

export default function SaveListingButton({
  listingId,
  initialSaved,
  initialCount,
  sellerUserId: _sellerUserId,
}: SaveListingButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const userId = (session?.user as { id?: string } | undefined)?.id;

  async function toggle() {
    if (!userId) {
      router.push(`/login?redirect=/m/${listingId}`);
      return;
    }

    const nextSaved = !saved;
    const nextCount = nextSaved ? count + 1 : count - 1;

    // Optimistic update
    setSaved(nextSaved);
    setCount(nextCount);
    setLoading(true);

    try {
      const res = await fetch(`/api/listings/${listingId}/save`, {
        method: nextSaved ? "POST" : "DELETE",
      });
      if (!res.ok) {
        // Revert on error
        setSaved(saved);
        setCount(count);
      }
    } catch {
      // Revert on network error
      setSaved(saved);
      setCount(count);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={loading}
      className={[
        "border rounded-lg px-3 py-2 text-sm flex items-center gap-1.5 transition-colors disabled:opacity-50",
        saved
          ? "bg-red-50 border-red-200 text-red-600"
          : "border-[var(--line)] hover:bg-[var(--clay)]",
      ].join(" ")}
      aria-label={saved ? "Unsave listing" : "Save listing"}
    >
      <span>{saved ? "❤️" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
