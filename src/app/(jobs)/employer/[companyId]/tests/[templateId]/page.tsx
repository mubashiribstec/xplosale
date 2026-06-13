"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  order: number;
  kind: string;
  body: string;
  points: number;
  metadata: {
    options?: { id: string; text: string }[];
    correctIds?: string[];
    multiSelect?: boolean;
  };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  passingScorePercent: number | null;
  isPublished: boolean;
  kind: string;
  questions: Question[];
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

function newOptionId() {
  return Math.random().toString(36).slice(2, 8);
}

export default function TestEditorPage({
  params,
}: {
  params: Promise<{ companyId: string; templateId: string }>;
}) {
  const { companyId, templateId } = use(params);
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addingNew, setAddingNew] = useState(false);

  const [newQ, setNewQ] = useState<{
    body: string;
    points: string;
    options: { id: string; text: string }[];
    correctIds: string[];
    multiSelect: boolean;
  }>({
    body: "",
    points: "1",
    options: [
      { id: newOptionId(), text: "" },
      { id: newOptionId(), text: "" },
    ],
    correctIds: [],
    multiSelect: false,
  });

  useEffect(() => {
    fetch(`/api/ats/tests/${templateId}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; data?: Template }) => {
        if (j.ok && j.data) setTemplate(j.data);
      });
  }, [templateId]);

  async function saveSettings() {
    if (!template) return;
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/ats/tests/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: template.name,
        description: template.description,
        durationMin: template.durationMin,
        passingScorePercent: template.passingScorePercent,
      }),
    });
    const j = await res.json() as { ok: boolean; error?: string };
    setSaving(false);
    if (!j.ok) { setError(j.error ?? "Save failed"); return; }
    flash("Settings saved");
  }

  async function togglePublish() {
    if (!template) return;
    if (template.questions.length === 0) {
      setError("Add at least one question before publishing.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/ats/tests/${templateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !template.isPublished }),
    });
    const j = await res.json() as { ok: boolean; data?: Template; error?: string };
    setSaving(false);
    if (j.ok && j.data) {
      setTemplate((prev) => prev ? { ...prev, isPublished: j.data!.isPublished } : prev);
      flash(j.data!.isPublished ? "Published" : "Unpublished");
    }
  }

  async function deleteTemplate() {
    if (!confirm("Delete this test? This cannot be undone.")) return;
    const res = await fetch(`/api/ats/tests/${templateId}`, { method: "DELETE" });
    const j = await res.json() as { ok: boolean; error?: string };
    if (!j.ok) { setError(j.error ?? "Delete failed"); return; }
    router.push(`/employer/${companyId}/tests`);
  }

  async function addQuestion() {
    const opts = newQ.options.filter((o) => o.text.trim());
    if (!newQ.body.trim()) return;
    if (opts.length < 2) { setError("Add at least 2 options."); return; }
    if (newQ.correctIds.length === 0) { setError("Select at least one correct answer."); return; }

    const res = await fetch(`/api/ats/tests/${templateId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "MCQ",
        body: newQ.body,
        points: parseInt(newQ.points, 10) || 1,
        metadata: {
          options: opts,
          correctIds: newQ.correctIds,
          multiSelect: newQ.multiSelect,
        },
      }),
    });
    const j = await res.json() as { ok: boolean; data?: Question; error?: string };
    if (!j.ok) { setError(j.error ?? "Failed"); return; }
    setTemplate((prev) =>
      prev ? { ...prev, questions: [...prev.questions, j.data!] } : prev
    );
    setAddingNew(false);
    resetNewQ();
    flash("Question added");
  }

  async function deleteQuestion(qId: string) {
    if (!confirm("Delete this question?")) return;
    await fetch(`/api/ats/tests/${templateId}/questions/${qId}`, { method: "DELETE" });
    setTemplate((prev) =>
      prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== qId) } : prev
    );
  }

  function resetNewQ() {
    setNewQ({
      body: "",
      points: "1",
      options: [{ id: newOptionId(), text: "" }, { id: newOptionId(), text: "" }],
      correctIds: [],
      multiSelect: false,
    });
    setError(null);
  }

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  }

  if (!template) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p style={{ color: "var(--ink-faint)" }}>Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/employer/${companyId}/tests`} className="text-sm hover:opacity-80 transition-opacity" style={{ color: "var(--ink-faint)" }}>
              ← All tests
            </Link>
            <h1 className="text-xl font-bold mt-1" style={{ color: "var(--ink)" }}>{template.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={togglePublish}
              disabled={saving}
              className="px-3 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={
                template.isPublished
                  ? { background: "var(--paper-2)", color: "var(--ink-soft)" }
                  : { background: "var(--green)", color: "var(--white)" }
              }
            >
              {template.isPublished ? "Unpublish" : "Publish"}
            </button>
            <button
              onClick={deleteTemplate}
              className="px-3 py-1.5 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}
            >
              Delete
            </button>
          </div>
        </div>

        {msg && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(14,158,110,.12)", color: "var(--green)" }}>{msg}</p>}
        {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}>{error}</p>}

        {/* Settings */}
        <section className="rounded-xl border p-5 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <h2 className="font-semibold" style={{ color: "var(--ink)" }}>Settings</h2>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Name</label>
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate((p) => p ? { ...p, name: e.target.value } : p)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Description</label>
            <textarea
              value={template.description ?? ""}
              onChange={(e) => setTemplate((p) => p ? { ...p, description: e.target.value } : p)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)] resize-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Duration (min)</label>
              <input
                type="number"
                value={template.durationMin}
                onChange={(e) => setTemplate((p) => p ? { ...p, durationMin: parseInt(e.target.value, 10) || 1 } : p)}
                min={1} max={300}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Passing score %</label>
              <input
                type="number"
                value={template.passingScorePercent ?? ""}
                onChange={(e) => setTemplate((p) => p ? { ...p, passingScorePercent: e.target.value ? parseInt(e.target.value, 10) : null } : p)}
                min={0} max={100} placeholder="Optional"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </section>

        {/* Questions */}
        <section className="rounded-xl border p-5 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
              Questions <span className="font-normal" style={{ color: "var(--ink-faint)" }}>({template.questions.length})</span>
            </h2>
            {!addingNew && (
              <button
                onClick={() => { setAddingNew(true); }}
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: "var(--blue)" }}
              >
                + Add question
              </button>
            )}
          </div>

          {/* Existing questions */}
          <div className="space-y-3">
            {template.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((q, idx) => (
                <div key={q.id} className="border rounded-lg p-4" style={{ borderColor: "var(--line)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>
                        <span className="mr-2" style={{ color: "var(--ink-faint)" }}>{idx + 1}.</span>
                        {q.body}
                      </p>
                      <div className="mt-2 space-y-1">
                        {q.metadata.options?.map((opt, oi) => (
                          <p
                            key={opt.id}
                            className={`text-xs ${q.metadata.correctIds?.includes(opt.id) ? "font-medium" : ""}`}
                            style={{ color: q.metadata.correctIds?.includes(opt.id) ? "var(--green)" : "var(--ink-faint)" }}
                          >
                            {OPTION_LETTERS[oi]}. {opt.text}
                            {q.metadata.correctIds?.includes(opt.id) && " ✓"}
                          </p>
                        ))}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>{q.points} pt{q.points !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="text-xs shrink-0 hover:opacity-80 transition-opacity"
                      style={{ color: "#C83C28" }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Add new question form */}
          {addingNew && (
            <div className="border rounded-lg p-4 space-y-4" style={{ borderColor: "var(--blue)", background: "rgba(50,122,214,.08)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--ink-soft)" }}>New MCQ Question</h3>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Question</label>
                <textarea
                  value={newQ.body}
                  onChange={(e) => setNewQ((p) => ({ ...p, body: e.target.value }))}
                  rows={2}
                  placeholder="Enter the question…"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)] resize-none"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium" style={{ color: "var(--ink-soft)" }}>Options (mark correct)</label>
                  <label className="flex items-center gap-1 text-xs" style={{ color: "var(--ink-faint)" }}>
                    <input
                      type="checkbox"
                      checked={newQ.multiSelect}
                      onChange={(e) => setNewQ((p) => ({ ...p, multiSelect: e.target.checked }))}
                      className="rounded"
                    />
                    Multi-select
                  </label>
                </div>
                <div className="space-y-2">
                  {newQ.options.map((opt, oi) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type={newQ.multiSelect ? "checkbox" : "radio"}
                        name={`correct-${newQ.body}`}
                        checked={newQ.correctIds.includes(opt.id)}
                        onChange={(e) => {
                          if (newQ.multiSelect) {
                            setNewQ((p) => ({
                              ...p,
                              correctIds: e.target.checked
                                ? [...p.correctIds, opt.id]
                                : p.correctIds.filter((id) => id !== opt.id),
                            }));
                          } else {
                            setNewQ((p) => ({ ...p, correctIds: [opt.id] }));
                          }
                        }}
                        className="shrink-0"
                      />
                      <span className="text-xs shrink-0" style={{ color: "var(--ink-faint)" }}>{OPTION_LETTERS[oi]}.</span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const text = e.target.value;
                          setNewQ((p) => ({
                            ...p,
                            options: p.options.map((o) => o.id === opt.id ? { ...o, text } : o),
                          }));
                        }}
                        placeholder={`Option ${OPTION_LETTERS[oi]}`}
                        className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--clay)]"
                        style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
                      />
                      {newQ.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewQ((p) => ({
                            ...p,
                            options: p.options.filter((o) => o.id !== opt.id),
                            correctIds: p.correctIds.filter((id) => id !== opt.id),
                          }))}
                          className="text-xs hover:opacity-80 transition-opacity"
                          style={{ color: "#C83C28" }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {newQ.options.length < 5 && (
                  <button
                    type="button"
                    onClick={() => setNewQ((p) => ({ ...p, options: [...p.options, { id: newOptionId(), text: "" }] }))}
                    className="mt-2 text-xs hover:opacity-80 transition-opacity"
                    style={{ color: "var(--blue)" }}
                  >
                    + Add option
                  </button>
                )}
              </div>

              <div className="w-24">
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Points</label>
                <input
                  type="number"
                  value={newQ.points}
                  onChange={(e) => setNewQ((p) => ({ ...p, points: e.target.value }))}
                  min={1} max={100}
                  className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--clay)]"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "var(--clay)", color: "var(--white)" }}
                >
                  Add Question
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingNew(false); resetNewQ(); }}
                  className="px-4 py-2 text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Status summary */}
        {template.questions.length > 0 && (
          <div className="rounded-xl border p-4 text-sm" style={{ background: "var(--paper-2)", borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            {template.questions.length} questions ·{" "}
            {template.questions.reduce((s, q) => s + q.points, 0)} total points ·{" "}
            {template.durationMin} min
            {template.passingScorePercent != null && ` · ${template.passingScorePercent}% to pass`}
          </div>
        )}
      </div>
    </main>
  );
}

