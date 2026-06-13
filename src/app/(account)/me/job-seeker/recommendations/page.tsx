"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Recommendation = {
  id: string;
  score: number;
  reasons: string[];
  jobPosting: {
    id: string;
    title: string;
    remoteType: string;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    company: { id: string; name: string };
    region: { id: string; name: string };
  };
};

function scoreColor(score: number): { background: string; color: string } {
  if (score >= 0.8) return { background: "rgba(14,158,110,.12)", color: "var(--green)" };
  if (score >= 0.5) return { background: "rgba(50,122,214,.12)", color: "var(--blue)" };
  return { background: "var(--paper-2)", color: "var(--ink-soft)" };
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/account/recommendations");
    if (res.status === 401) { router.push("/login"); return; }
    if (res.ok) {
      const { data } = await res.json() as { data: { items: Recommendation[] } };
      setRecs(data.items ?? []);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function dismiss(id: string) {
    setDismissing(id);
    await fetch(`/api/account/recommendations/${id}/dismiss`, { method: "POST" });
    setRecs((prev) => prev.filter((r) => r.id !== id));
    setDismissing(null);
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: "var(--paper)" }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--display)" }}>Job Recommendations</h1>
          <a href="/me/job-seeker" className="text-sm hover:underline" style={{ color: "var(--blue)" }}>← Profile settings</a>
        </div>

        {loading && (
          <div className="text-center py-12" style={{ color: "var(--ink-faint)" }}>Loading recommendations…</div>
        )}

        {!loading && recs.length === 0 && (
          <div className="rounded-2xl border p-12 text-center" style={{ background: "var(--white)", borderColor: "var(--line)", color: "var(--ink-faint)" }}>
            <p className="text-lg font-medium">No recommendations yet.</p>
            <p className="text-sm mt-1">Make sure your profile is visible to recruiters in your job seeker settings.</p>
            <a href="/me/job-seeker" className="mt-4 inline-block hover:underline text-sm" style={{ color: "var(--blue)" }}>Update settings →</a>
          </div>
        )}

        {recs.map((rec) => (
          <div key={rec.id} className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg leading-tight" style={{ color: "var(--ink)" }}>{rec.jobPosting.title}</h2>
                <p className="text-sm" style={{ color: "var(--ink-faint)" }}>{rec.jobPosting.company.name} · {rec.jobPosting.region.name}</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full shrink-0" style={scoreColor(rec.score)}>
                {Math.round(rec.score * 100)}% match
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full" style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}>{rec.jobPosting.remoteType}</span>
              {rec.jobPosting.salaryMin != null && (
                <span className="px-2 py-1 rounded-full" style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}>
                  {rec.jobPosting.currency ?? "PKR"} {rec.jobPosting.salaryMin.toLocaleString()}
                  {rec.jobPosting.salaryMax ? `–${rec.jobPosting.salaryMax.toLocaleString()}` : "+"}
                </span>
              )}
              {(rec.reasons as string[]).map((r) => (
                <span key={r} className="px-2 py-1 rounded-full" style={{ background: "rgba(50,122,214,.12)", color: "var(--blue)" }}>{r}</span>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href={`/jobs/${rec.jobPosting.id}`}
                className="flex-1 text-center text-sm font-medium py-2 rounded-xl transition"
                style={{ background: "var(--clay)", color: "var(--white)" }}
              >
                View Job
              </a>
              <button
                onClick={() => dismiss(rec.id)}
                disabled={dismissing === rec.id}
                className="px-4 text-sm border rounded-xl disabled:opacity-50 transition"
                style={{ color: "var(--ink-faint)", borderColor: "var(--line)" }}
              >
                {dismissing === rec.id ? "…" : "Dismiss"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
