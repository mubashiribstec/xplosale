"use client";

import { useState } from "react";

type TeamMember = {
  id: string;
  role: string;
  addedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    networkProfile: { handle: string; profilePhotoUrl: string | null } | null;
  };
};

const ROLE_LABELS: Record<string, string> = {
  RECRUITER: "Recruiter",
  HIRING_MANAGER: "Hiring Manager",
  INTERVIEWER: "Interviewer",
  OBSERVER: "Observer",
};

const ROLE_COLORS: Record<string, string> = {
  RECRUITER: "bg-blue-100 text-blue-700",
  HIRING_MANAGER: "bg-purple-100 text-purple-700",
  INTERVIEWER: "bg-green-100 text-green-700",
  OBSERVER: "bg-gray-100 text-gray-600",
};

export default function HiringTeamManager({
  jobId,
  initialTeam,
}: {
  jobId: string;
  initialTeam: TeamMember[];
}) {
  const [team, setTeam] = useState(initialTeam);
  const [form, setForm] = useState({ identifier: "", role: "RECRUITER" });
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!form.identifier.trim()) return;
    setAdding(true);
    setMsg(null);

    const res = await fetch(`/api/ats/team/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = (await res.json()) as { ok: boolean; data?: TeamMember; error?: string };
    setAdding(false);

    if (res.ok && json.data) {
      setTeam((prev) => {
        const exists = prev.find((m) => m.id === json.data!.id);
        return exists
          ? prev.map((m) => (m.id === json.data!.id ? json.data! : m))
          : [...prev, json.data!];
      });
      setForm({ identifier: "", role: "RECRUITER" });
      setMsg({ ok: true, text: "Member added" });
    } else {
      setMsg({ ok: false, text: json.error ?? "Failed to add member" });
    }
  }

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/ats/team/${jobId}/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      setTeam((prev) => prev.filter((m) => m.id !== memberId));
    }
  }

  return (
    <div className="space-y-6">
      {/* Current team */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {team.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No team members yet. Add people below.
          </div>
        ) : (
          team.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {(member.user.name ?? member.user.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.user.name ?? member.user.email ?? member.user.phone ?? "Unknown"}
                </p>
                {member.user.networkProfile && (
                  <p className="text-xs text-gray-400">@{member.user.networkProfile.handle}</p>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-600"}`}
              >
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add member form */}
      <form onSubmit={(e) => void addMember(e)} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Add team member</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.identifier}
            onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
            placeholder="Phone, email, or @handle"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding || !form.identifier.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
        )}
      </form>
    </div>
  );
}
