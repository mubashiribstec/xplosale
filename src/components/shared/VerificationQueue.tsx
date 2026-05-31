"use client";

import { useState, useEffect, useCallback } from "react";

type PendingUser = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
  verificationStatus: string;
  docType: string | null;
};

type FileUrls = { docType: string; front: string; back: string | null; selfie: string };

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
      const { data } = await res.json() as { data: PendingUser[] };
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
        const { data } = await res.json() as { data: FileUrls };
        setFiles(data);
      }
    } finally {
      setFilesLoading(false);
    }
  }

  async function act(action: "approve" | "reject") {
    if (!selected) return;
    const isPassport = selected.docType === "PASSPORT";
    if (action === "approve" && !isPassport && !cnicNumber) {
      setMsg("Enter the CNIC number to approve.");
      return;
    }
    setActing(true);
    setMsg("");
    const res = await fetch(`/api/admin/verifications/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        reason,
        cnicNumber: (action === "approve" && !isPassport) ? cnicNumber : undefined,
      }),
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">{u.name ?? u.email ?? "Unknown"}</p>
                <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  u.docType === "PASSPORT" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                }`}>
                  {u.docType ?? "CNIC"}
                </span>
              </div>
              <p className="text-xs text-gray-400">{u.phone ?? u.email ?? ""}</p>
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
            <div className="flex items-center gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{selected.name ?? selected.email ?? "Unknown"}</h2>
                <p className="text-sm text-gray-400">{selected.phone ?? selected.email ?? ""}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                selected.docType === "PASSPORT" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>
                {selected.docType ?? "CNIC"}
              </span>
            </div>

            {filesLoading ? (
              <p className="text-sm text-gray-400">Loading documents&hellip;</p>
            ) : files ? (
              <div className={`grid gap-2 mb-4 ${files.back ? "grid-cols-3" : "grid-cols-2"}`}>
                {(["front", files.back !== null ? "back" : null, "selfie"] as const)
                  .filter((s): s is "front" | "back" | "selfie" => s !== null)
                  .map((slot) => {
                    const url = files[slot];
                    if (!url) return null;
                    return (
                      <div key={slot}>
                        <p className="text-xs text-gray-500 mb-1 capitalize">{slot}</p>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={slot}
                            className="w-full h-28 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </a>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-amber-600 mb-4">Documents not yet uploaded by user.</p>
            )}

            <div className="space-y-3">
              {selected.docType !== "PASSPORT" && (
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
              )}
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
