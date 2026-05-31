"use client";

import { useState } from "react";

type NetProfile = { handle: string; headline: string | null } | null;

type ConnectionUser = {
  id: string;
  name: string;
  networkProfile: NetProfile;
};

type Connection = {
  id: string;
  requesterId: string;
  recipientId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "BLOCKED";
  requester: ConnectionUser;
  recipient: ConnectionUser;
};

type ConnectionManagerProps = {
  connections: Connection[];
  currentUserId: string;
};

export default function ConnectionManager({ connections, currentUserId }: ConnectionManagerProps) {
  const [tab, setTab] = useState<"pending" | "sent" | "connected">("pending");
  const [items, setItems] = useState(connections);
  const [loading, setLoading] = useState<string | null>(null);

  const pending = items.filter((c) => c.status === "PENDING" && c.recipientId === currentUserId);
  const sent = items.filter((c) => c.status === "PENDING" && c.requesterId === currentUserId);
  const connected = items.filter((c) => c.status === "ACCEPTED");

  async function patch(id: string, action: "accept" | "reject") {
    setLoading(id);
    try {
      const res = await fetch(`/api/network/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((c) =>
            c.id === id
              ? { ...c, status: action === "accept" ? "ACCEPTED" : "REJECTED" }
              : c
          )
        );
      }
    } finally {
      setLoading(null);
    }
  }

  async function remove(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/network/connections/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setLoading(null);
    }
  }

  const tabs = [
    { key: "pending" as const, label: `Pending (${pending.length})` },
    { key: "sent" as const, label: `Sent (${sent.length})` },
    { key: "connected" as const, label: `Connected (${connected.length})` },
  ];

  const displayList = tab === "pending" ? pending : tab === "sent" ? sent : connected;

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {displayList.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">Nothing here yet.</p>
      )}

      <div className="space-y-3">
        {displayList.map((c) => {
          const other = c.requesterId === currentUserId ? c.recipient : c.requester;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4"
            >
              <div>
                <a
                  href={other.networkProfile ? `/n/${other.networkProfile.handle}` : "#"}
                  className="font-medium text-gray-900 text-sm hover:underline"
                >
                  {other.name}
                </a>
                {other.networkProfile?.headline && (
                  <p className="text-xs text-gray-500 mt-0.5">{other.networkProfile.headline}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {tab === "pending" && (
                  <>
                    <button
                      onClick={() => patch(c.id, "accept")}
                      disabled={loading === c.id}
                      className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => patch(c.id, "reject")}
                      disabled={loading === c.id}
                      className="px-3 py-1 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                {tab === "sent" && (
                  <button
                    onClick={() => remove(c.id)}
                    disabled={loading === c.id}
                    className="px-3 py-1 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Withdraw
                  </button>
                )}
                {tab === "connected" && (
                  <button
                    onClick={() => remove(c.id)}
                    disabled={loading === c.id}
                    className="px-3 py-1 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
