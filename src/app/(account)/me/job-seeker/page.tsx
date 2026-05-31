"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type JSProfile = {
  headline: string | null;
  summary: string | null;
  currentRoleTitle: string | null;
  openToWork: boolean;
  expectedSalaryMin: number | null;
  expectedSalaryMax: number | null;
  currency: string | null;
};

export default function JobSeekerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<JSProfile | null>(null);
  const [form, setForm] = useState({ headline: "", summary: "", currentRoleTitle: "", openToWork: true, expectedSalaryMin: "", expectedSalaryMax: "", currency: "PKR" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/account/profile/job-seeker")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            headline: data.headline ?? "",
            summary: data.summary ?? "",
            currentRoleTitle: data.currentRoleTitle ?? "",
            openToWork: data.openToWork ?? true,
            expectedSalaryMin: data.expectedSalaryMin?.toString() ?? "",
            expectedSalaryMax: data.expectedSalaryMax?.toString() ?? "",
            currency: data.currency ?? "PKR",
          });
        }
      });
  }, []);

  function set(k: string, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/account/profile/job-seeker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        expectedSalaryMin: form.expectedSalaryMin ? parseInt(form.expectedSalaryMin) : undefined,
        expectedSalaryMax: form.expectedSalaryMax ? parseInt(form.expectedSalaryMax) : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { setProfile(data.data); setMsg("Saved!"); setTimeout(() => router.push("/me"), 1000); }
    else setMsg(data.error ?? "Save failed");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/me")} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{profile ? "Edit" : "Set up"} Job Seeker Profile</h1>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          {[
            { label: "Headline", key: "headline", placeholder: "e.g. Senior Engineer | React | Node.js", max: 120 },
            { label: "Current Role", key: "currentRoleTitle", placeholder: "e.g. Software Engineer at Startup", max: 100 },
          ].map(({ label, key, placeholder, max }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="text" value={(form as unknown as Record<string,string>)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} maxLength={max}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3} maxLength={2000} placeholder="Brief professional summary..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary (PKR)</label>
              <input type="number" value={form.expectedSalaryMin} onChange={(e) => set("expectedSalaryMin", e.target.value)} placeholder="e.g. 100000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary (PKR)</label>
              <input type="number" value={form.expectedSalaryMax} onChange={(e) => set("expectedSalaryMax", e.target.value)} placeholder="e.g. 250000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.openToWork} onChange={(e) => set("openToWork", e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-700">Open to work</span>
          </label>
          {msg && <p className="text-sm text-blue-600">{msg}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save Job Seeker Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
