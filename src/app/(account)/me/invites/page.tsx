"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Invite = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  message: string | null;
  expiresAt: string;
  createdAt: string;
  jobPosting: {
    id: string;
    title: string;
    company: { id: string; name: string };
  };
  sender: { id: string; name: string | null };
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-red-100 text-red-600",
};

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [optedOut, setOptedOut] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, dncRes] = await Promise.all([
      fetch("/api/invites/received"),
      fetch("/api/invites/do-not-contact"),
    ]);
    if (invRes.status === 401) { router.push("/login"); return; }
    if (invRes.ok) {
      const { data } = await invRes.json() as { data: { invites: Invite[] } };
      setInvites(data.invites ?? []);
    }
    if (dncRes.ok) {
      const { data } = await dncRes.json() as { data: { optedOut: boolean } };
      setOptedOut(data.optedOut);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function respond(id: string, action: "accept" | "decline") {
    setResponding(id);
    const res = await fetch(`/api/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const { data } = await res.json() as { data: Invite };
      setInvites((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: data.status } : inv));
    }
    setResponding(null);
  }

  async function toggleDoNotContact() {
    setToggling(true);
    if (optedOut) {
      await fetch("/api/invites/do-not-contact", { method: "DELETE" });
      setOptedOut(false);
    } else {
      await fetch("/api/invites/do-not-contact", { method: "POST" });
      setOptedOut(true);
    }
    setToggling(false);
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Invite to Apply Inbox</h1>

        {loading && <div className="text-center py-12 text-gray-400">Loading…</div>}

        {!loading && invites.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-lg">No invitations yet.</p>
            <p className="text-sm mt-1">Recruiters can invite you to apply to their open jobs.</p>
          </div>
        )}

        {invites.map((inv) => (
          <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{inv.jobPosting.title}</h2>
                <p className="text-gray-500 text-sm">{inv.jobPosting.company.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">From {inv.sender.name ?? "Recruiter"}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${STATUS_STYLES[inv.status] ?? ""}`}>
                {inv.status}
              </span>
            </div>

            {inv.message && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 italic">{inv.message}</p>
            )}

            {inv.status === "PENDING" && (
              <p className="text-xs text-gray-400">
                Expires {new Date(inv.expiresAt).toLocaleDateString()}
              </p>
            )}

            {inv.status === "PENDING" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => respond(inv.id, "accept")}
                  disabled={responding === inv.id}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => respond(inv.id, "decline")}
                  disabled={responding === inv.id}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Decline
                </button>
                <a
                  href={`/jobs/${inv.jobPosting.id}`}
                  className="px-4 text-sm text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 flex items-center transition"
                >
                  View
                </a>
              </div>
            )}
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-6">
          <h2 className="font-semibold text-gray-900 mb-1">Invitation preferences</h2>
          <p className="text-sm text-gray-500 mb-3">
            Block all future invitations from recruiters. You can undo this at any time.
          </p>
          <button
            onClick={toggleDoNotContact}
            disabled={toggling}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${
              optedOut
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            }`}
          >
            {toggling ? "…" : optedOut ? "Allow invitations again" : "Block all invitations"}
          </button>
        </div>
      </div>
    </main>
  );
}
