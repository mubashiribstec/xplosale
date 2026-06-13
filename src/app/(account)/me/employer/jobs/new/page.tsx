"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SkillsChipInput from "@/components/shared/SkillsChipInput";
import JobLocationPicker, { type JobLocation } from "@/components/shared/jobs/JobLocationPicker";

const REMOTE_TYPES = [
  { value: "ONSITE", label: "On-site" },
  { value: "HYBRID", label: "Hybrid" },
  { value: "REMOTE", label: "Remote" },
] as const;

const EMPTY_LOCATION: JobLocation = {
  country: "",
  city: "",
  postCode: "",
  companyAddress: "",
};

export default function NewJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description,
      remoteType: form.remoteType,
      currency: form.currency,
      requiredSkills,
      niceToHaveSkills,
      requiredKeywords,
    };
    if (form.salaryMin) body.salaryMin = parseInt(form.salaryMin, 10);
    if (form.salaryMax) body.salaryMax = parseInt(form.salaryMax, 10);
    if (location.country) body.country = location.country;
    if (location.city) body.city = location.city;
    if (location.postCode) body.postCode = location.postCode;
    if (location.companyAddress) body.companyAddress = location.companyAddress;

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json() as { ok: boolean; data?: { id: string }; error?: string };
    setLoading(false);

    if (!res.ok || !json.ok) {
      setError(json.error ?? "Failed to create job posting");
      return;
    }

    router.push(`/me/employer/jobs/${json.data!.id}/edit`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={() => router.push("/me/employer/jobs")}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Post a Job</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Job Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                minLength={5}
                maxLength={200}
                placeholder="e.g. Senior Software Engineer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
                minLength={20}
                maxLength={10000}
                rows={8}
                placeholder="Describe the role, responsibilities, and requirements..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work type</label>
              <select
                value={form.remoteType}
                onChange={(e) => set("remoteType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {REMOTE_TYPES.map((rt) => (
                  <option key={rt.value} value={rt.value}>{rt.label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Location */}
          <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Location</h2>
              {form.remoteType !== "REMOTE" && (
                <p className="text-xs text-gray-400 mt-0.5">Select country and city where this role is based.</p>
              )}
            </div>
            <JobLocationPicker
              value={location}
              onChange={setLocation}
              remoteType={form.remoteType}
            />
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
                  onChange={(e) => set("currency", e.target.value)}
                  maxLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min salary</label>
                <input
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => set("salaryMin", e.target.value)}
                  min={1}
                  placeholder="e.g. 80000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max salary</label>
                <input
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => set("salaryMax", e.target.value)}
                  min={1}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </section>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create Job Posting"}
          </button>
        </form>
      </div>
    </main>
  );
}
