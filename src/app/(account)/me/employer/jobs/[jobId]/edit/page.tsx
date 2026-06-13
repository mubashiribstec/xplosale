"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import SkillsChipInput from "@/components/shared/SkillsChipInput";
import JobLocationPicker, { type JobLocation } from "@/components/shared/jobs/JobLocationPicker";

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
  country?: string | null;
  city?: string | null;
  postCode?: string | null;
  companyAddress?: string | null;
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

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  APPLIED: { background: "rgba(50,122,214,.12)", color: "var(--blue)" },
  REVIEWED: { background: "var(--paper-2)", color: "var(--ink-soft)" },
  SHORTLISTED: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
  REJECTED: { background: "rgba(200,60,40,.12)", color: "#C83C28" },
  HIRED: { background: "rgba(144,37,179,.12)", color: "var(--purple)" },
};
const DEFAULT_STATUS_STYLE: { background: string; color: string } = { background: "var(--paper-2)", color: "var(--ink-soft)" };

const EMPTY_LOCATION: JobLocation = { country: "", city: "", postCode: "", companyAddress: "" };

export default function EditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<JobData | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    remoteType: "ONSITE",
    salaryMin: "",
    salaryMax: "",
    currency: "PKR",
  });

  const [location, setLocation] = useState<JobLocation>(EMPTY_LOCATION);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>([]);
  const [requiredKeywords, setRequiredKeywords] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/jobs/${jobId}`).then((r) => r.json()),
      fetch(`/api/jobs/${jobId}/applications`).then((r) => r.json()),
    ]).then(([jobRes, appsRes]) => {
      if (jobRes.data) {
        const d = jobRes.data as JobData;
        setJob(d);
        setForm({
          title: d.title,
          description: d.description,
          remoteType: d.remoteType,
          salaryMin: d.salaryMin != null ? String(d.salaryMin) : "",
          salaryMax: d.salaryMax != null ? String(d.salaryMax) : "",
          currency: d.currency,
        });
        setLocation({
          country: d.country ?? "",
          city: d.city ?? "",
          postCode: d.postCode ?? "",
          companyAddress: d.companyAddress ?? "",
        });
        setRequiredSkills(d.requiredSkills ?? []);
        setNiceToHaveSkills(d.niceToHaveSkills ?? []);
        setRequiredKeywords(d.requiredKeywords ?? []);
      }
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
      remoteType: form.remoteType,
      currency: form.currency,
      country: location.country || null,
      city: location.city || null,
      postCode: location.postCode || null,
      companyAddress: location.companyAddress || null,
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
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p style={{ color: "var(--ink-faint)" }}>Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/me/employer/jobs")}
            className="text-sm transition-colors"
            style={{ color: "var(--ink-faint)" }}
          >
            Back to jobs
          </button>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold" style={{ color: "var(--ink)", fontFamily: "var(--display)" }}>Edit Job Posting</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}>
              {job.status}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <section className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>Job Details</h2>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                required
                minLength={5}
                maxLength={200}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                required
                minLength={20}
                maxLength={10000}
                rows={8}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Work type</label>
              <select
                value={form.remoteType}
                onChange={(e) => setField("remoteType", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
              >
                {REMOTE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Location */}
          <section className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <div>
              <h2 className="font-semibold" style={{ color: "var(--ink)" }}>Location</h2>
              {form.remoteType !== "REMOTE" && (
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>Country and city where this role is based.</p>
              )}
            </div>
            <JobLocationPicker
              value={location}
              onChange={setLocation}
              remoteType={form.remoteType}
            />
          </section>

          <section className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>Matching Criteria</h2>
            <p className="text-xs" style={{ color: "var(--ink-faint)" }}>Used to automatically score and rank candidates. Leave blank to skip scoring.</p>
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

          <section className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <h2 className="font-semibold" style={{ color: "var(--ink)" }}>Compensation</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Currency</label>
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  maxLength={10}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Min salary</label>
                <input
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => setField("salaryMin", e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Max salary</label>
                <input
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => setField("salaryMax", e.target.value)}
                  min={1}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
                />
              </div>
            </div>
          </section>

          {error && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}>{error}</p>}
          {msg && <p className="text-sm" style={{ color: "var(--green)" }}>{msg}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 font-semibold rounded-xl disabled:opacity-50 transition-colors"
              style={{ background: "var(--clay)", color: "var(--white)" }}
            >
              {loading ? "Saving…" : "Save changes"}
            </button>

            {job.status === "DRAFT" && (
              <button
                type="button"
                onClick={publish}
                disabled={loading}
                className="flex-1 py-3 font-semibold rounded-xl disabled:opacity-50 transition-colors"
                style={{ background: "var(--green)", color: "var(--white)" }}
              >
                Publish
              </button>
            )}
          </div>
        </form>

        <section className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <h2 className="font-semibold" style={{ color: "var(--ink)" }}>
            Applicants <span className="font-normal" style={{ color: "var(--ink-faint)" }}>({applicants.length})</span>
          </h2>

          {applicants.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>No applications yet.</p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {applicants.map((app) => (
                <div key={app.id} className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--ink)" }}>
                        {app.jobSeeker.user.name ?? "Unknown"}
                      </p>
                      {app.jobSeeker.headline && (
                        <p className="text-xs" style={{ color: "var(--ink-faint)" }}>{app.jobSeeker.headline}</p>
                      )}
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={STATUS_COLORS[app.status] ?? DEFAULT_STATUS_STYLE}
                    >
                      {app.status}
                    </span>
                  </div>

                  {app.coverLetter && (
                    <p className="text-xs line-clamp-2" style={{ color: "var(--ink-soft)" }}>{app.coverLetter}</p>
                  )}

                  <div className="flex items-center gap-3">
                    <a
                      href={app.resumeSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline"
                      style={{ color: "var(--blue)" }}
                    >
                      View resume
                    </a>
                    <select
                      value={app.status}
                      onChange={(e) => updateApplicationStatus(app.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }}
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
