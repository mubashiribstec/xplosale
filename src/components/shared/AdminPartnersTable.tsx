"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PartnerUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isPartner: boolean;
  partnerType: string | null;
  partnerSuspendedAt: string | null;
  createdAt: string;
}

interface AdminPartnersTableProps {
  partners: PartnerUser[];
}

interface ActionModalState {
  userId: string;
  name: string;
  action: "suspend" | "downgrade";
  reason: string;
  loading: boolean;
  error: string;
}

export default function AdminPartnersTable({ partners }: AdminPartnersTableProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ActionModalState | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function callAction(userId: string, action: "suspend" | "reinstate" | "downgrade", reason?: string) {
    const res = await fetch(`/api/admin/partners/${userId}/action`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    return (await res.json()) as { ok: boolean; error?: string };
  }

  async function reinstate(userId: string) {
    setLoadingId(userId);
    setError(null);
    const json = await callAction(userId, "reinstate");
    setLoadingId(null);
    if (json.ok) {
      router.refresh();
    } else {
      setError(json.error ?? "Failed");
    }
  }

  function openModal(p: PartnerUser, action: "suspend" | "downgrade") {
    setModal({ userId: p.id, name: p.name ?? "Partner", action, reason: "", loading: false, error: "" });
  }

  async function submitModal() {
    if (!modal) return;
    if (!modal.reason.trim()) {
      setModal((m) => m ? { ...m, error: "Reason is required." } : null);
      return;
    }
    setModal((m) => m ? { ...m, loading: true, error: "" } : null);
    const json = await callAction(modal.userId, modal.action, modal.reason);
    if (json.ok) {
      setModal(null);
      router.refresh();
    } else {
      setModal((m) => m ? { ...m, loading: false, error: json.error ?? "Failed" } : null);
    }
  }

  if (partners.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No active partners.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-bold text-gray-900">
              {modal.action === "suspend" ? `Suspend ${modal.name}` : `Downgrade ${modal.name}`}
            </h2>
            <p className="text-sm text-gray-500">
              {modal.action === "suspend"
                ? "Reverts the account to a regular USER role. The partner can be reinstated later."
                : "Permanently revokes partner status — partner type is cleared. They would need to re-apply."}
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason (required)</label>
              <textarea
                value={modal.reason}
                onChange={(e) => setModal((m) => m ? { ...m, reason: e.target.value } : null)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Explain the reason…"
              />
            </div>
            {modal.error && <p className="text-xs text-red-600">{modal.error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitModal()}
                disabled={modal.loading}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {modal.loading ? "Working…" : modal.action === "suspend" ? "Suspend" : "Downgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Contact</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Since</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partners.map((p) => {
              const suspended = !!p.partnerSuspendedAt;
              return (
                <tr key={p.id}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{p.name ?? "—"}</td>
                  <td className="py-3 pr-4 text-gray-600">{p.email ?? p.phone ?? "—"}</td>
                  <td className="py-3 pr-4 text-gray-600">{p.partnerType ?? "—"}</td>
                  <td className="py-3 pr-4">
                    {suspended ? (
                      <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        SUSPENDED
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString("en-PK")}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {suspended ? (
                        <button
                          type="button"
                          onClick={() => void reinstate(p.id)}
                          disabled={loadingId === p.id}
                          className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {loadingId === p.id ? "…" : "Reinstate"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openModal(p, "suspend")}
                          className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded hover:bg-orange-200 transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openModal(p, "downgrade")}
                        className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 transition-colors"
                      >
                        Downgrade
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
