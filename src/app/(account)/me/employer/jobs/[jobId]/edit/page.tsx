"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import SkillsChipInput from "@/components/shared/SkillsChipInput";

interface Region {
  id: string;
  name: string;
  slug: string;
  city: string;
}

interface JobData {
  id: string;
  title: string;
  description: string;
  regionId: string;
  remoteType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: string;
  requiredSkills?: string[];
  niceToHaveSkills?: string[];
  requiredKeywords?: string[];
}

interface Applicant {
  id: string;
  status: string;
  coverLetter: string | null;
  createdAt: string;
  resumeSignedUrl: string;
  jobSeeker: {
    id: string;
    headline: string | null;
    user: { id: string; name: string | null };
  };
}

const REMOTE_TYPES = [
  { value: "ONSITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
] as const;

const APPLICATION_STATUSES = ["REVIEWED", "SHORTLISTED", "REJECTED", "HIRED"] as const;

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-50 text-blue-600",
  REVIEWED: "bg-gray-100 text-gray-600",
  SHORTLISTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  HIRED: "bg-purple-100 text-purple-700",
};

export default function EditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobData | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    regionId: "",
    remoteType: "ONSITE",
    salaryMin: "",
    salaryMax: "",
    currency: "PKR",
  });

  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [requiredKeywords, setRequiredKeywords] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/jobs/${jobId}`).then((r) => r.json()),
      fetch("/api/regions").then((r) => r.json()),
      fetch(`/api/jobs/${jobId}/applications`).then((r) => r.json()),
    ]).then(([jobRes, regionsRes, appsRes]) => {
      if (jobRes.data) {
        const d = jobRes.data as JobData;
        setJob(d);
        setForm({
          title: d.title,
          description: d.description,
          regionId: d.regionId,
          remoteType: d.remoteType,
          salaryMin: d.salaryMin != null ? String(d.salaryMin) : "",
          salaryMax: d.salaryMax != null ? String(d.salaryMax) : "",
          currency: d.currency,
        });
        setRequiredSkills(d.requiredSkills ?? []);
        setNiceToHaveSkills(d.niceToHaveSkills ?? []);
        setRequiredKeywords(d.requiredKeywords ?? []);
      }
      if (regionsRes.data) setRegions(regionsRes.data as Region[]);
      if (appsRes.data) setApplicants(appsRes.data as Applicant[]);
    });
  }, [jobId]);

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      regionId: form.regionId,
      remoteType: form.remoteType,
      currency: form.currency,
      requiredSkills,
      niceToHaveSkills,
      requiredKeywords,
    };
    if (form.salaryMin) body.salaryMin = parseInt(form.salaryMin, 10);
    if (form.salaryMax) body.salaryMax = parseInt(form.salaryMax, 10);

    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { ok: boolean; data?: JobData; error?: string };
    setLoading(false);

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Save failed");
      return;
    }

    setJob(json.data!);
    setMsg("Saved!");
    setTimeout(() => setMsg(null), 2000);
  }

  async function publish() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    const json = await res.json() as { ok: boolean; data?: JobData; error?: string };
    setLoading(false);
    if (!res.ok || !json.ok) { setError(json.error ?? "Failed"); return; }
    setJob(json.data!);
    setMsg("Published!");
    setTimeout(() => setMsg(null), 2000);
  }

  async function updateApplicationStatus(applicationId: string, status: string) {
    const res = await fetch(`/api/jobs/${jobId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json() as { ok: boolean; data?: Applicant };
    if (json.ok && json.data) {
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: json.data!.status } : a))
      );
    }
  }

  if (!job) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/me/employer/jobs")}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Back to jobs
          </button>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-gray-900">Edit Job Posting</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {job.status}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Job Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
                minLength={5}
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                required
                minLength={20}
                maxLength={10000}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
              <select
                value={form.regionId}
                onChange={(e) => setField("regionId", e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.city ? `${r.city} — ` : ""}{r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work type</label>
              <select
                value={form.remoteType}
                onChange={(e) => setField("remoteType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REMOTE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>

          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Matching Criteria</h2>
            <p className="text-xs text-gray-400">Used to automatically score and rank candidates. Leave blank to skip scoring.</p>
            <SkillsChipInput
              label="Required skills"
              value={requiredSkills}
              onChange={setRequiredSkills}
              placeholder="e.g. React, TypeScript…"
            />
            <SkillsChipInput
              label="Nice-to-have skills"
              value={niceToHaveSkills}
              onChange={setNiceToHaveSkills}
              placeholder="e.g. GraphQL, Docker…"
            />
            <SkillsChipInput
              label="Keywords"
              value={requiredKeywords}
              onChange={setRequiredKeywords}
              placeholder="e.g. leadership, agile…"
            />
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Compensation</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min salary</label>
                <input
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => setField("salaryMin", e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max salary</label>
                <input
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => setField("salaryMax", e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {msg && <p className="text-sm text-green-600">{msg}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>

            {job.status === "DRAFT" && (
              <button
                type="button"
                onClick={publish}
                disabled={loading}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Publish
              </button>
            )}
          </div>
        </form>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Applicants <span className="text-gray-400 font-normal">({applicants.length})</span>
          </h2>

          {applicants.length === 0 ? (
            <p className="text-sm text-gray-400">No applications yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {applicants.map((app) => (
                <div key={app.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {app.jobSeeker.user.name ?? "Unknown"}
                      </p>
                      {app.jobSeeker.headline && (
                        <p className="text-xs text-gray-500">{app.jobSeeker.headline}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {app.status}
                    </span>
                  </div>

                  {app.coverLetter && (
                    <p className="text-xs text-gray-600 line-clamp-2">{app.coverLetter}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <a
                      href={app.resumeSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View resume
                    </a>
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={app.status} disabled>{app.status}</option>
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
