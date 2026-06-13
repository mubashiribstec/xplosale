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

const STATUS_STYLES: Record<string, { background: string; color: string }> = {
  PENDING: { background: "rgba(160,78,55,.12)", color: "var(--clay)" },
  ACCEPTED: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
  DECLINED: { background: "var(--paper-2)", color: "var(--ink-soft)" },
  EXPIRED: { background: "rgba(200,60,40,.12)", color: "#C83C28" },
};
const DEFAULT_STATUS_STYLE: { background: string; color: string } = { background: "var(--paper-2)", color: "var(--ink-soft)" };

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
    <main className="min-h-screen px-4 py-8" style={{ background: "var(--paper)" }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--display)" }}>Invite to Apply Inbox</h1>

        {loading && <div className="text-center py-12" style={{ color: "var(--ink-faint)" }}>Loading…</div>}

        {!loading && invites.length === 0 && (
          <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--white)", borderColor: "var(--line)", color: "var(--ink-faint)" }}>
            <p className="text-lg">No invitations yet.</p>
            <p className="text-sm mt-1">Recruiters can invite you to apply to their open jobs.</p>
          </div>
        )}

        {invites.map((inv) => (
          <div key={inv.id} className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold" style={{ color: "var(--ink)" }}>{inv.jobPosting.title}</h2>
                <p className="text-sm" style={{ color: "var(--ink-faint)" }}>{inv.jobPosting.company.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>From {inv.sender.name ?? "Recruiter"}</p>
              </div>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full shrink-0"
                style={STATUS_STYLES[inv.status] ?? DEFAULT_STATUS_STYLE}
              >
                {inv.status}
              </span>
            </div>

            {inv.message && (
              <p className="text-sm rounded-xl p-3 italic" style={{ color: "var(--ink-soft)", background: "var(--paper)" }}>{inv.message}</p>
            )}

            {inv.status === "PENDING" && (
              <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                Expires {new Date(inv.expiresAt).toLocaleDateString()}
              </p>
            )}

            {inv.status === "PENDING" && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => respond(inv.id, "accept")}
                  disabled={responding === inv.id}
                  className="flex-1 text-sm font-medium py-2 rounded-xl disabled:opacity-50 transition"
                  style={{ background: "var(--clay)", color: "var(--white)" }}
                >
                  Accept
                </button>
                <button
                  onClick={() => respond(inv.id, "decline")}
                  disabled={responding === inv.id}
                  className="flex-1 border text-sm font-medium py-2 rounded-xl disabled:opacity-50 transition"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
                >
                  Decline
                </button>
                <a
                  href={`/jobs/${inv.jobPosting.id}`}
                  className="px-4 text-sm border rounded-xl flex items-center transition"
                  style={{ color: "var(--blue)", borderColor: "rgba(50,122,214,.3)" }}
                >
                  View
                </a>
              </div>
            )}
          </div>
        ))}

        <div className="rounded-2xl border p-5 mt-6" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <h2 className="font-semibold mb-1" style={{ color: "var(--ink)" }}>Invitation preferences</h2>
          <p className="text-sm mb-3" style={{ color: "var(--ink-faint)" }}>
            Block all future invitations from recruiters. You can undo this at any time.
          </p>
          <button
            onClick={toggleDoNotContact}
            disabled={toggling}
            className="px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
            style={
              optedOut
                ? { background: "var(--green)", color: "var(--white)" }
                : { background: "rgba(200,60,40,.08)", color: "#C83C28", border: "1px solid rgba(200,60,40,.25)" }
            }
          >
            {toggling ? "…" : optedOut ? "Allow invitations again" : "Block all invitations"}
          </button>
        </div>
      </div>
    </main>
  );
}
