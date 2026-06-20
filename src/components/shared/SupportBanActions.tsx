"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SupportBanActionsProps {
  roomId: string;
  userId: string;
  banned: boolean;
}

export default function SupportBanActions({ roomId, userId, banned }: SupportBanActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function decide(ban: boolean) {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ban
            ? { ban: true, reason: "Permanently banned via support decision." }
            : { ban: false }
        ),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Failed to update ban status.");
        return;
      }

      await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: ban
            ? "Your account has been permanently banned following our review."
            : "Your account has been unbanned. You now have full access again.",
        }),
      });

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {banned ? (
        <button
          onClick={() => void decide(false)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
        >
          {loading ? "Working…" : "Unban"}
        </button>
      ) : (
        <button
          onClick={() => void decide(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
        >
          {loading ? "Working…" : "Ban permanently"}
        </button>
      )}
    </div>
  );
}
