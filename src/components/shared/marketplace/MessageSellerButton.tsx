"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface MessageSellerButtonProps {
  listingId: string;
  sellerUserId: string;
}

export default function MessageSellerButton({ listingId, sellerUserId }: MessageSellerButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userId = (session?.user as { id?: string } | undefined)?.id;

  async function openChat() {
    if (!userId) {
      router.push(`/login?redirect=/m/${listingId}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contextType: "LISTING", contextId: listingId, otherUserId: sellerUserId }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { id?: string }; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not open chat. Please try again.");
        return;
      }
      router.push(`/chat/${json.data!.id!}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void openChat()}
        disabled={loading}
        className="block w-full text-center py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        {loading ? "Opening chat…" : "💬 Message Seller"}
      </button>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}
