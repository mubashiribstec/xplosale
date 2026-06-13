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

function scoreColor(score: number) {
  if (score >= 0.8) return "bg-green-100 text-green-700";
  if (score >= 0.5) return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
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
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Job Recommendations</h1>
          <a href="/me/job-seeker" className="text-sm text-blue-600 hover:underline">← Profile settings</a>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-400">Loading recommendations…</div>
        )}

        {!loading && recs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-lg font-medium">No recommendations yet.</p>
            <p className="text-sm mt-1">Make sure your profile is visible to recruiters in your job seeker settings.</p>
            <a href="/me/job-seeker" className="mt-4 inline-block text-blue-600 hover:underline text-sm">Update settings →</a>
          </div>
        )}

        {recs.map((rec) => (
          <div key={rec.id} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg leading-tight">{rec.jobPosting.title}</h2>
                <p className="text-gray-500 text-sm">{rec.jobPosting.company.name} · {rec.jobPosting.region.name}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${scoreColor(rec.score)}`}>
                {Math.round(rec.score * 100)}% match
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{rec.jobPosting.remoteType}</span>
              {rec.jobPosting.salaryMin != null && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {rec.jobPosting.currency ?? "PKR"} {rec.jobPosting.salaryMin.toLocaleString()}
                  {rec.jobPosting.salaryMax ? `–${rec.jobPosting.salaryMax.toLocaleString()}` : "+"}
                </span>
              )}
              {(rec.reasons as string[]).map((r) => (
                <span key={r} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{r}</span>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <a
                href={`/jobs/${rec.jobPosting.id}`}
                className="flex-1 text-center bg-blue-600 text-white text-sm font-medium py-2 rounded-xl hover:bg-blue-700 transition"
              >
                View Job
              </a>
              <button
                onClick={() => dismiss(rec.id)}
                disabled={dismissing === rec.id}
                className="px-4 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
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
