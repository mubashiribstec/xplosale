"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type EmployerData = {
  roleAtCompany: string | null;
  company: { name: string; industry: string | null; size: string | null; websiteUrl: string | null };
} | null;

export default function EmployerProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<EmployerData>(null);
  const [form, setForm] = useState({ companyName: "", industry: "", size: "", websiteUrl: "", roleAtCompany: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/account/profile/employer")
      .then((r) => r.json())
      .then(({ data: d }) => {
        if (d) {
          setData(d);
          setForm({ companyName: d.company.name ?? "", industry: d.company.industry ?? "", size: d.company.size ?? "", websiteUrl: d.company.websiteUrl ?? "", roleAtCompany: d.roleAtCompany ?? "" });
        }
      });
  }, []);

  function set(k: string, v: string) { setForm((prev) => ({ ...prev, [k]: v })); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) { setMsg("Company name is required."); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/account/profile/employer", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await res.json();
    setSaving(false);
    if (res.ok) { setData(d.data); setMsg("Saved!"); setTimeout(() => router.push("/me"), 1000); }
    else setMsg(d.error ?? "Save failed");
  }

  const sizes = ["1-10", "11-50", "50-200", "200-500", "500+"];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/me")} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{data ? "Edit" : "Set up"} Employer Profile</h1>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input type="text" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required placeholder="e.g. TechPakistan Pvt. Ltd."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input type="text" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Technology, Real Estate"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
            <select value={form.size} onChange={(e) => set("size", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select size</option>
              {sizes.map((s) => <option key={s} value={s}>{s} employees</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input type="url" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://yourcompany.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Role at Company</label>
            <input type="text" value={form.roleAtCompany} onChange={(e) => set("roleAtCompany", e.target.value)} placeholder="e.g. HR Manager, Founder"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {msg && <p className="text-sm text-blue-600">{msg}</p>}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save Employer Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
