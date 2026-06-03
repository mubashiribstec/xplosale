"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AdminEscrowResolveProps {
  escrowId: string;
}

export default function AdminEscrowResolve({ escrowId }: AdminEscrowResolveProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(outcome: "release" | "refund") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escrow/${escrowId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError((json as { error?: string }).error ?? "Failed to resolve");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="button"
        onClick={() => resolve("release")}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        Release to Seller
      </button>
      <button
        type="button"
        onClick={() => resolve("refund")}
        disabled={loading}
        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        Refund to Buyer
      </button>
    </div>
  );
}
