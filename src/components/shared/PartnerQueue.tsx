"use client";

import { useState, useEffect, useCallback } from "react";

type PartnerApp = {
  id: string;
  userId: string;
  partnerType: string;
  businessName: string | null;
  website: string | null;
  description: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; phone: string | null; email: string | null; verificationStatus: string };
};

export function PartnerQueue() {
  const [apps, setApps] = useState<PartnerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PartnerApp | null>(null);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/admin/partners");
    if (res.ok) {
      const { data } = await res.json() as { data: PartnerApp[] };
      setApps(data);
    }
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  async function act(action: "approve" | "reject") {
    if (!selected) return;
    setActing(true);
    setMsg("");
    const res = await fetch(`/api/admin/partners/${selected.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = await res.json() as { data?: { message: string }; error?: string };
    if (res.ok) {
      setMsg(data.data?.message ?? "Done");
      setSelected(null);
      fetchQueue();
    } else {
      setMsg(data.error ?? "Action failed");
    }
    setActing(false);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading&hellip;</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {apps.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No pending partner applications.</p>
        ) : (
          apps.map((a) => (
            <button
              key={a.id}
              onClick={() => { setSelected(a); setReason(""); setMsg(""); }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === a.id ? "bg-amber-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">{a.user.name ?? a.user.email ?? "Unknown"}</p>
                <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {a.partnerType}
                </span>
              </div>
              {a.businessName && <p className="text-xs text-gray-500">{a.businessName}</p>}
              <p className="text-xs text-gray-300">{new Date(a.createdAt).toLocaleDateString()}</p>
            </button>
          ))
        )}
      </div>

      <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
        {!selected ? (
          <p className="text-sm text-gray-400">Select an application to review.</p>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">{selected.user.name ?? selected.user.email}</h2>
              <p className="text-sm text-gray-400">{selected.user.phone ?? selected.user.email ?? ""}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {selected.partnerType}
                </span>
                {selected.businessName && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {selected.businessName}
                  </span>
                )}
              </div>
            </div>

            {selected.website && (
              <p className="text-sm text-blue-600 mb-2">
                <a href={selected.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {selected.website}
                </a>
              </p>
            )}

            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason / Notes (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Business documents verified"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {msg && <p className="text-sm text-blue-600">{msg}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => act("approve")}
                  disabled={acting}
                  className="flex-1 py-2 px-4 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {acting ? "…" : "Approve as Partner"}
                </button>
                <button
                  onClick={() => act("reject")}
                  disabled={acting}
                  className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {acting ? "…" : "Reject"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
