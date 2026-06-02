"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

type Props = {
  vertical: string;
  queryJson: object;
  defaultName?: string;
};

export default function SaveSearchButton({ vertical, queryJson, defaultName = "" }: Props) {
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [frequency, setFrequency] = useState("OFF");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Please enter a name."); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/search/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vertical, name: name.trim(), queryJson, frequency }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setOpen(false);
    } else {
      setError("Failed to save. Are you signed in?");
    }
  }

  if (saved) {
    return (
      <button className="flex items-center gap-1.5 text-sm text-blue-600 font-medium" disabled>
        <BookmarkCheck className="w-4 h-4" />
        Saved
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition"
      >
        <Bookmark className="w-4 h-4" />
        Save search
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 w-72 space-y-3">
          <p className="font-semibold text-gray-900 text-sm">Save this search</p>
          <input
            type="text"
            placeholder="Name this search…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
          >
            <option value="OFF">No alerts</option>
            <option value="DAILY">Daily alert</option>
            <option value="WEEKLY">Weekly alert</option>
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {saving ? "Saving…" : "Save"}
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
