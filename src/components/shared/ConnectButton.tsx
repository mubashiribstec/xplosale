"use client";

import { useState } from "react";

type ConnectButtonProps = {
  targetUserId: string;
  currentUserId: string | null;
  initialStatus: "none" | "pending" | "accepted" | "incoming";
  connectionId?: string;
};

export default function ConnectButton({
  targetUserId,
  currentUserId,
  initialStatus,
  connectionId: initialConnectionId,
}: ConnectButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [connectionId, setConnectionId] = useState(initialConnectionId);
  const [loading, setLoading] = useState(false);

  if (!currentUserId || currentUserId === targetUserId) return null;

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/network/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: targetUserId }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setStatus("pending");
        setConnectionId(data.id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept() {
    if (!connectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/network/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      });
      if (res.ok) setStatus("accepted");
    } finally {
      setLoading(false);
    }
  }

  async function handleWithdraw() {
    if (!connectionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/network/connections/${connectionId}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("none");
        setConnectionId(undefined);
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "accepted") {
    return (
      <span className="px-4 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
        Connected
      </span>
    );
  }

  if (status === "pending") {
    return (
      <button
        onClick={handleWithdraw}
        disabled={loading}
        className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {loading ? "…" : "Pending"}
      </button>
    );
  }

  if (status === "incoming") {
    return (
      <button
        onClick={handleAccept}
        disabled={loading}
        className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "…" : "Accept"}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "…" : "Connect"}
    </button>
  );
}
