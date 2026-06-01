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

const KIND_COLORS: Record<string, string> = {
  INTERVIEW_INVITE: "bg-blue-100 text-blue-700",
  REJECT: "bg-red-100 text-red-700",
  OFFER: "bg-green-100 text-green-700",
  ASSESSMENT_INVITE: "bg-purple-100 text-purple-700",
  CUSTOM: "bg-gray-100 text-gray-600",
};

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
          <h2 className="text-sm font-semibold text-gray-700">Email templates</h2>
          <button
            type="button"
            onClick={startCreate}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            + New template
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">
            No templates yet. Create one to send personalised emails to candidates.
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`bg-white border rounded-xl p-3 cursor-pointer hover:border-blue-200 transition-colors ${editing?.id === t.id ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-200"}`}
                onClick={() => startEdit(t)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.subject}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${KIND_COLORS[t.kind] ?? "bg-gray-100 text-gray-600"}`}>
                      {KIND_LABELS[t.kind] ?? t.kind}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void deleteTemplate(t.id); }}
                      className="text-gray-300 hover:text-red-400 transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            {editing ? "Edit template" : "New template"}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Template name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Interview invitation"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kind</label>
              <select
                value={form.kind}
                onChange={(e) => set("kind", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(KIND_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Your application to {{job.title}}"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Body</label>
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={8}
                placeholder={`Hi {{candidate.name}},\n\nThank you for applying to {{job.title}} at {{company.name}}…`}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">
                Variables: <code>{"{{candidate.name}}"}</code> <code>{"{{job.title}}"}</code> <code>{"{{company.name}}"}</code> <code>{"{{candidate.email}}"}</code> <code>{"{{sender.name}}"}</code>
              </p>
            </div>
          </div>

          {msg && (
            <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setCreating(false); setEditing(null); }}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : editing ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
