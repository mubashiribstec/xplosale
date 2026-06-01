"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function NewTestPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    durationMin: "30",
    passingScorePercent: "",
  });

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      companyId,
      name: form.name,
      kind: "MCQ",
      durationMin: parseInt(form.durationMin, 10),
    };
    if (form.description) body.description = form.description;
    if (form.passingScorePercent) body.passingScorePercent = parseInt(form.passingScorePercent, 10);

    const res = await fetch("/api/ats/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { ok: boolean; data?: { id: string }; error?: string };
    setLoading(false);

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Failed to create test");
      return;
    }

    router.push(`/employer/${companyId}/tests/${json.data!.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button type="button" onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">New Assessment Test</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Test name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. JavaScript Fundamentals"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What does this test assess?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={form.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                required
                min={1}
                max={300}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing score % <span className="text-gray-400">(optional)</span></label>
              <input
                type="number"
                value={form.passingScorePercent}
                onChange={(e) => set("passingScorePercent", e.target.value)}
                min={0}
                max={100}
                placeholder="e.g. 70"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create Test"}
          </button>
        </form>
      </div>
    </main>
  );
}
