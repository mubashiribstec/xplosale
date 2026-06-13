"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ResumeUploader from "@/components/shared/ResumeUploader";

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
  const [loadError, setLoadError] = useState("");
  const [resumeKey, setResumeKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/profile/job-seeker")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          if (data.resumeUrl) setResumeKey(data.resumeUrl);
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
      })
      .catch(() => setLoadError("Failed to load profile. Please refresh."));
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
    <main className="min-h-screen px-4 py-8" style={{ background: "var(--paper)" }}>
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/me")} className="text-sm mb-4 transition-colors" style={{ color: "var(--ink-faint)" }}>← Back</button>
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--ink)", fontFamily: "var(--display)" }}>{profile ? "Edit" : "Set up"} Job Seeker Profile</h1>
        {loadError && <p className="text-sm mb-4" style={{ color: "#C83C28" }}>{loadError}</p>}
        <form onSubmit={handleSave} className="rounded-2xl border p-6 space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          {[
            { label: "Headline", key: "headline", placeholder: "e.g. Senior Engineer | React | Node.js", max: 120 },
            { label: "Current Role", key: "currentRoleTitle", placeholder: "e.g. Software Engineer at Startup", max: 100 },
          ].map(({ label, key, placeholder, max }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>{label}</label>
              <input type="text" value={(form as unknown as Record<string,string>)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} maxLength={max}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Summary</label>
            <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3} maxLength={2000} placeholder="Brief professional summary..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Min Salary (PKR)</label>
              <input type="number" value={form.expectedSalaryMin} onChange={(e) => set("expectedSalaryMin", e.target.value)} placeholder="e.g. 100000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Max Salary (PKR)</label>
              <input type="number" value={form.expectedSalaryMax} onChange={(e) => set("expectedSalaryMax", e.target.value)} placeholder="e.g. 250000"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: "var(--line)", color: "var(--ink)", background: "var(--white)" }} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.openToWork} onChange={(e) => set("openToWork", e.target.checked)} className="rounded" />
            <span className="text-sm" style={{ color: "var(--ink-soft)" }}>Open to work</span>
          </label>
          <ResumeUploader
            currentKey={resumeKey ?? undefined}
            onUpload={(key) => {
              setResumeKey(key);
              setMsg("Resume uploaded successfully.");
            }}
          />
          {msg && <p className="text-sm" style={{ color: "var(--blue)" }}>{msg}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "var(--clay)", color: "var(--white)" }}>
            {saving ? "Saving…" : "Save Job Seeker Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
