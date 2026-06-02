"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

type Props = {
  jobPostingId: string;
  candidateId: string;
  companyId: string;
};

const ERROR_MESSAGES: Record<number, string> = {
  403: "Candidate has opted out of invitations or is not discoverable.",
  409: "You have already invited this candidate to this job.",
  429: "Rate limit reached. Try again later.",
};

export default function InviteButton({ jobPostingId, candidateId, companyId }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setSending(true);
    setError("");
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobPostingId, candidateId, companyId, message: message.trim() || undefined }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setOpen(false);
    } else {
      const msg = ERROR_MESSAGES[res.status] ?? "Failed to send invitation.";
      setError(msg);
    }
  }

  if (sent) {
    return (
      <button disabled className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
        <Mail className="w-4 h-4" />
        Invited
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition"
      >
        <Mail className="w-4 h-4" />
        Invite to Apply
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 w-80 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">Invite to Apply</p>
          <textarea
            placeholder="Optional message to the candidate…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void handleSend()}
              disabled={sending}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {sending ? "Sending…" : "Send Invite"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
