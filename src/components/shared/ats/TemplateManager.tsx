"use client";

import { useState } from "react";

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  kind: string;
};

const KIND_LABELS: Record<string, string> = {
  INTERVIEW_INVITE: "Interview invite",
  REJECT: "Rejection",
  OFFER: "Offer",
  ASSESSMENT_INVITE: "Assessment invite",
  CUSTOM: "Custom",
};

const KIND_COLORS: Record<string, { background: string; color: string }> = {
  INTERVIEW_INVITE: { background: "rgba(50,122,214,.12)", color: "var(--blue)" },
  REJECT: { background: "rgba(200,60,40,.12)", color: "#C83C28" },
  OFFER: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
  ASSESSMENT_INVITE: { background: "rgba(144,37,179,.12)", color: "var(--purple)" },
  CUSTOM: { background: "var(--paper-2)", color: "var(--ink-soft)" },
};

const DEFAULT_KIND_COLOR = { background: "var(--paper-2)", color: "var(--ink-soft)" };

const BLANK_FORM = { name: "", subject: "", body: "", kind: "CUSTOM" };

export default function TemplateManager({
  companyId,
  initialTemplates,
}: {
  companyId: string;
  initialTemplates: Template[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  function startCreate() {
    setEditing(null);
    setForm(BLANK_FORM);
    setMsg(null);
    setCreating(true);
  }

  function startEdit(t: Template) {
    setCreating(false);
    setForm({ name: t.name, subject: t.subject, body: t.body, kind: t.kind });
    setMsg(null);
    setEditing(t);
  }

  async function save() {
    if (!form.name || !form.subject || !form.body) {
      setMsg({ ok: false, text: "Name, subject, and body are required" });
      return;
    }
    setSaving(true);
    setMsg(null);

    if (editing) {
      const res = await fetch(`/api/ats/templates/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { ok: boolean; data?: Template; error?: string };
      setSaving(false);
      if (res.ok && json.data) {
        setTemplates((prev) => prev.map((t) => (t.id === editing.id ? json.data! : t)));
        setEditing(null);
        setMsg({ ok: true, text: "Template updated" });
      } else {
        setMsg({ ok: false, text: json.error ?? "Save failed" });
      }
    } else {
      const res = await fetch("/api/ats/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, ...form }),
      });
      const json = (await res.json()) as { ok: boolean; data?: Template; error?: string };
      setSaving(false);
      if (res.ok && json.data) {
        setTemplates((prev) => [...prev, json.data!]);
        setCreating(false);
        setForm(BLANK_FORM);
        setMsg({ ok: true, text: "Template created" });
      } else {
        setMsg({ ok: false, text: json.error ?? "Save failed" });
      }
    }
  }

  async function deleteTemplate(id: string) {
    await fetch(`/api/ats/templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  const showForm = creating || !!editing;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Template list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>Email templates</h2>
          <button
            type="button"
            onClick={startCreate}
            className="text-xs font-medium hover:opacity-80 transition-colors"
            style={{ color: "var(--blue)" }}
          >
            + New template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="border-2 border-dashed rounded-2xl p-8 text-center text-sm" style={{ borderColor: "var(--paper-2)", color: "var(--ink-faint)" }}>
            No templates yet. Create one to send personalised emails to candidates.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="border rounded-xl p-3 cursor-pointer transition-colors hover:opacity-90"
                style={{
                  background: "var(--white)",
                  borderColor: editing?.id === t.id ? "var(--blue)" : "var(--line)",
                  boxShadow: editing?.id === t.id ? "0 0 0 1px rgba(50,122,214,.3)" : undefined,
                }}
                onClick={() => startEdit(t)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>{t.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--ink-faint)" }}>{t.subject}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={KIND_COLORS[t.kind] ?? DEFAULT_KIND_COLOR}>
                      {KIND_LABELS[t.kind] ?? t.kind}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void deleteTemplate(t.id); }}
                      className="transition-colors hover:opacity-80"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="border rounded-2xl p-5 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>
            {editing ? "Edit template" : "New template"}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-faint)" }}>Template name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Interview invitation"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-faint)" }}>Kind</label>
              <select
                value={form.kind}
                onChange={(e) => set("kind", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              >
                {Object.entries(KIND_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-faint)" }}>Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Your application to {{job.title}}"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-faint)" }}>Body</label>
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={8}
                maxLength={10000}
                placeholder={`Hi {{candidate.name}},\n\nThank you for applying to {{job.title}} at {{company.name}}…`}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>
                Variables: <code>{"{{candidate.name}}"}</code> <code>{"{{job.title}}"}</code> <code>{"{{company.name}}"}</code> <code>{"{{candidate.email}}"}</code> <code>{"{{sender.name}}"}</code>
              </p>
            </div>
          </div>

          {msg && (
            <p className="text-sm" style={{ color: msg.ok ? "var(--green)" : "#C83C28" }}>{msg.text}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setCreating(false); setEditing(null); }}
              className="flex-1 py-2 border rounded-lg text-sm transition-colors hover:opacity-80"
              style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ background: "var(--clay)", color: "var(--white)" }}
            >
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
