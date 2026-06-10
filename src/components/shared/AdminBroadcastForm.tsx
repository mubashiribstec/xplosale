"use client";

import { useState, type FormEvent } from "react";

const TARGETS = [
  { value: "ALL", label: "All users" },
  { value: "USER", label: "Users" },
  { value: "PARTNER", label: "Partners" },
  { value: "ADMIN", label: "Admins" },
];

export default function AdminBroadcastForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [targetRole, setTargetRole] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (targetRole === "ALL" && !window.confirm("Send this announcement to ALL users? This cannot be undone.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, linkUrl: linkUrl || undefined, targetRole }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { sent: number }; error?: string };
      if (json.ok) {
        setSuccess(`Sent to ${json.data?.sent ?? 0} user${json.data?.sent === 1 ? "" : "s"}.`);
        setTitle("");
        setBody("");
        setLinkUrl("");
      } else {
        setError(json.error ?? "Failed to send");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          maxLength={2000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="https://..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
        <select
          value={targetRole}
          onChange={(e) => setTargetRole(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">{success}</p>}

      <button
        type="submit"
        disabled={loading || !title.trim() || !body.trim()}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Sending…" : "Send Announcement"}
      </button>
    </form>
  );
}
