"use client";

import { useState, useRef } from "react";

type Stage = {
  id?: string;
  // Stable client-side key for rows that have no DB id yet (newly added).
  // Keeps React from reattaching input/color state to the wrong row on reorder.
  _uid?: string;
  name: string;
  order: number;
  color: string;
  isInitial: boolean;
  isHired: boolean;
  isRejected: boolean;
};

const uid = () => Math.random().toString(36).slice(2);
const rowKey = (s: Stage) => s.id ?? s._uid ?? "";

const PRESET_COLORS = [
  "#6B7280", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#10B981", "#EF4444", "#EC4899", "#F97316",
];

export default function PipelineSettings({
  companyId,
  initialStages,
}: {
  companyId: string;
  initialStages: Stage[];
}) {
  const [stages, setStages] = useState<Stage[]>(
    () => initialStages.map((s) => (s.id ? s : { ...s, _uid: uid() }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dragIdx = useRef<number | null>(null);

  function add() {
    setStages((prev) => [
      ...prev,
      { _uid: uid(), name: "New Stage", order: prev.length, color: "#6B7280", isInitial: false, isHired: false, isRejected: false },
    ]);
  }

  function remove(idx: number) {
    setStages((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  }

  function update(idx: number, patch: Partial<Stage>) {
    setStages((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function setFlag(idx: number, flag: "isInitial" | "isHired" | "isRejected") {
    setStages((prev) =>
      prev.map((s, i) => ({
        ...s,
        [flag]: i === idx ? !s[flag] : flag === "isInitial" && s.isInitial ? false : s[flag],
      }))
    );
  }

  function reorder(from: number, to: number) {
    setStages((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, order: i }));
    });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/ats/stages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, stages }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    setSaving(false);
    setMsg(res.ok ? { ok: true, text: "Saved!" } : { ok: false, text: json.error ?? "Save failed" });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {stages.map((stage, idx) => (
          <div
            key={rowKey(stage)}
            draggable
            onDragStart={() => { dragIdx.current = idx; }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragIdx.current !== null && dragIdx.current !== idx) { reorder(dragIdx.current, idx); dragIdx.current = null; } }}
            className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
          >
            {/* Drag handle */}
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5-6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
            </svg>

            {/* Color swatch */}
            <div className="relative flex-shrink-0">
              <input
                type="color"
                value={stage.color}
                onChange={(e) => update(idx, { color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                title="Pick color"
              />
            </div>

            {/* Name */}
            <input
              type="text"
              value={stage.name}
              onChange={(e) => update(idx, { name: e.target.value })}
              maxLength={50}
              className="flex-1 text-sm font-medium bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-blue-200 rounded px-1 py-0.5"
            />

            {/* Flag toggles */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setFlag(idx, "isInitial")}
                title="Initial stage (where new applications land)"
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${stage.isInitial ? "bg-blue-100 text-blue-700 border-blue-200" : "text-gray-400 border-gray-200 hover:border-gray-300"}`}
              >
                IN
              </button>
              <button
                type="button"
                onClick={() => setFlag(idx, "isHired")}
                title="Hired stage"
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${stage.isHired ? "bg-green-100 text-green-700 border-green-200" : "text-gray-400 border-gray-200 hover:border-gray-300"}`}
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => setFlag(idx, "isRejected")}
                title="Rejected stage"
                className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${stage.isRejected ? "bg-red-100 text-red-700 border-red-200" : "text-gray-400 border-gray-200 hover:border-gray-300"}`}
              >
                ✗
              </button>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => remove(idx)}
              disabled={stages.length <= 2}
              className="text-gray-300 hover:text-red-400 disabled:opacity-30 flex-shrink-0 transition-colors"
              title="Delete stage"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Add stage
        </button>
        <div className="ml-auto flex items-center gap-3">
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</span>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save pipeline"}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Drag rows to reorder. <span className="font-medium">IN</span> = initial (new applications land here). <span className="text-green-600 font-medium">✓</span> = hired. <span className="text-red-600 font-medium">✗</span> = rejected.
      </p>
    </div>
  );
}
