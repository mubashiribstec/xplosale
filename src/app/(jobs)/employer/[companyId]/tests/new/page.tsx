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
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "var(--ink-faint)" }}
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--ink)" }}>New Assessment Test</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border p-6 space-y-4"
          style={{ background: "var(--white)", borderColor: "var(--line)" }}
        >
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Test name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              minLength={2}
              maxLength={120}
              placeholder="e.g. JavaScript Fundamentals"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)]"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>
              Description <span style={{ color: "var(--ink-faint)" }}>(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What does this test assess?"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clay)] resize-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Duration (minutes)</label>
              <input
                type="number"
                value={form.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                required
                min={1}
                max={300}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>
                Passing score % <span style={{ color: "var(--ink-faint)" }}>(optional)</span>
              </label>
              <input
                type="number"
                value={form.passingScorePercent}
                onChange={(e) => set("passingScorePercent", e.target.value)}
                min={0}
                max={100}
                placeholder="e.g. 70"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            {loading ? "Creating…" : "Create Test"}
          </button>
        </form>
      </div>
    </main>
  );
}
