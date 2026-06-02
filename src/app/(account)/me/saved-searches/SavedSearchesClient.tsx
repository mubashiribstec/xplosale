"use client";

import { useState } from "react";

type SavedSearch = {
  id: string;
  name: string;
  vertical: string;
  frequency: "DAILY" | "WEEKLY" | "OFF";
  createdAt: string;
};

const VERTICAL_COLORS: Record<string, string> = {
  jobs: "bg-blue-100 text-blue-700",
  marketplace: "bg-purple-100 text-purple-700",
  network: "bg-green-100 text-green-700",
  companies: "bg-orange-100 text-orange-700",
};

export default function SavedSearchesClient({
  grouped,
}: {
  grouped: Record<string, SavedSearch[]>;
}) {
  const [searches, setSearches] = useState(
    Object.values(grouped).flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  const [deleting, setDeleting] = useState<string | null>(null);

  async function updateFrequency(id: string, frequency: string) {
    await fetch(`/api/search/saved/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ frequency }),
    });
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, frequency: frequency as SavedSearch["frequency"] } : s))
    );
  }

  async function deleteSearch(id: string) {
    setDeleting(id);
    await fetch(`/api/search/saved/${id}`, { method: "DELETE" });
    setSearches((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  }

  return (
    <div className="space-y-3">
      {searches.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${VERTICAL_COLORS[s.vertical] ?? "bg-gray-100 text-gray-600"}`}>
            {s.vertical}
          </span>
          <span className="flex-1 font-medium text-gray-900 truncate">{s.name}</span>
          <select
            value={s.frequency}
            onChange={(e) => void updateFrequency(s.id, e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
          >
            <option value="OFF">No alerts</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
          <button
            onClick={() => void deleteSearch(s.id)}
            disabled={deleting === s.id}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
          >
            {deleting === s.id ? "…" : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}
