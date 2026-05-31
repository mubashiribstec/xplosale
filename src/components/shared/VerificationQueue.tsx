"use client";

import { useState, useEffect, useCallback } from "react";

type PendingUser = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  verificationStatus: string;
};

type FileUrls = { front: string; back: string; selfie: string };

export function VerificationQueue() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingUser | null>(null);
  const [files, setFiles] = useState<FileUrls | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [cnicNumber, setCnicNumber] = useState("");
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchQueue = useCallback(async () => {
    const res = await fetch("/api/admin/verifications");
    if (res.ok) {
      const { data } = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  async function selectUser(user: PendingUser) {
    setSelected(user);
    setFiles(null);
    setMsg("");
    setCnicNumber("");
    setReason("");
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications/${user.id}/files`);
      if (res.ok) {
        const { data } = await res.json();
        setFiles(data);
      }
    } finally {
      setFilesLoading(false);
    }
  }

  async function act(action: "approve" | "reject") {
    if (!selected) return;
    if (action === "approve" && !cnicNumber) {
      setMsg("Enter the CNIC number to approve.");
      return;
    }
    setActing(true);
    setMsg("");
    const res = await fetch(`/api/admin/verifications/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, cnicNumber: action === "approve" ? cnicNumber : undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(data.data.message);
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
      {/* Queue list */}
      <div className="md:col-span-1 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {users.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No pending verifications.</p>
        ) : (
          users.map((u) => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === u.id ? "bg-blue-50" : ""}`}
            >
              <p className="text-sm font-medium text-gray-800">{u.name}</p>
              <p className="text-xs text-gray-400">{u.phone}</p>
              <p className="text-xs text-gray-300">{new Date(u.createdAt).toLocaleDateString()}</p>
            </button>
          ))
        )}
      </div>

      {/* Viewer */}
      <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
        {!selected ? (
          <p className="text-sm text-gray-400">Select a user to review their documents.</p>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">{selected.name}</h2>
            <p className="text-sm text-gray-400 mb-4">{selected.phone}</p>

            {filesLoading ? (
              <p className="text-sm text-gray-400">Loading documents&hellip;</p>
            ) : files ? (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["front", "back", "selfie"] as const).map((slot) => (
                  <div key={slot}>
                    <p className="text-xs text-gray-500 mb-1 capitalize">{slot}</p>
                    <a href={files[slot]} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={files[slot]}
                        alt={slot}
                        className="w-full h-28 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-600 mb-4">Documents not yet uploaded by user.</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CNIC Number (required for approval)</label>
                <input
                  type="text"
                  value={cnicNumber}
                  onChange={(e) => setCnicNumber(e.target.value)}
                  placeholder="35202-1234567-1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason / Notes (optional)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Documents verified manually"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {msg && <p className="text-sm text-blue-600">{msg}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => act("approve")}
                  disabled={acting}
                  className="flex-1 py-2 px-4 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {acting ? "…" : "Approve"}
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
