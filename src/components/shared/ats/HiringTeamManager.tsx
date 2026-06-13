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

const ROLE_COLORS: Record<string, { background: string; color: string }> = {
  RECRUITER: { background: "rgba(50,122,214,.12)", color: "var(--blue)" },
  HIRING_MANAGER: { background: "rgba(144,37,179,.12)", color: "var(--purple)" },
  INTERVIEWER: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
  OBSERVER: { background: "var(--paper-2)", color: "var(--ink-soft)" },
};

const DEFAULT_ROLE_COLOR = { background: "var(--paper-2)", color: "var(--ink-soft)" };

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
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
        {team.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
            No team members yet. Add people below.
          </div>
        ) : (
          team.map((member) => (
            <div key={member.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--paper-2)" }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                style={{ background: "rgba(50,122,214,.12)", color: "var(--blue)" }}
              >
                {(member.user.name ?? member.user.email ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                  {member.user.name ?? member.user.email ?? member.user.phone ?? "Unknown"}
                </p>
                {member.user.networkProfile && (
                  <p className="text-xs" style={{ color: "var(--ink-faint)" }}>@{member.user.networkProfile.handle}</p>
                )}
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={ROLE_COLORS[member.role] ?? DEFAULT_ROLE_COLOR}
              >
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                className="transition-colors hover:opacity-80"
                style={{ color: "var(--ink-faint)" }}
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
      <form onSubmit={(e) => void addMember(e)} className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>Add team member</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.identifier}
            onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
            placeholder="Phone, email, or @handle"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--line)" }}
          />
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: "var(--line)" }}
          >
            {Object.entries(ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={adding || !form.identifier.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {msg && (
          <p className="text-sm" style={{ color: msg.ok ? "var(--green)" : "#C83C28" }}>{msg.text}</p>
        )}
      </form>
    </div>
  );
}
