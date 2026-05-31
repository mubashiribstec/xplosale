"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type NetProfile = {
  handle: string;
  headline: string | null;
  summary: string | null;
  currentRole: string | null;
  location: string | null;
  visibility: "PUBLIC" | "CONNECTIONS";
} | null;

export default function NetworkProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<NetProfile>(null);
  const [form, setForm] = useState({ handle: "", headline: "", summary: "", currentRole: "", location: "", visibility: "PUBLIC" as "PUBLIC" | "CONNECTIONS" });
  const [handleState, setHandleState] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/account/profile/network")
      .then((r) => r.json())
      .then(({ data: d }) => {
        if (d) { setProfile(d); setForm({ handle: d.handle, headline: d.headline ?? "", summary: d.summary ?? "", currentRole: d.currentRole ?? "", location: d.location ?? "", visibility: d.visibility ?? "PUBLIC" }); }
      });
  }, []);

  const checkHandle = useCallback(async (handle: string) => {
    if (!handle || !/^[a-z0-9_]{3,30}$/.test(handle)) { setHandleState("idle"); return; }
    setHandleState("checking");
    const res = await fetch(`/api/account/profile/network/check-handle?handle=${encodeURIComponent(handle)}`);
    const { data } = await res.json();
    setHandleState(data?.available ? "available" : "taken");
  }, []);

  function set(k: string, v: string) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "handle") checkHandle(v.toLowerCase());
      return { ...next, handle: next.handle.toLowerCase() };
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (handleState === "taken") { setMsg("Handle is already taken."); return; }
    setSaving(true); setMsg("");
    const res = await fetch("/api/account/profile/network", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) { setProfile(data.data); setMsg("Saved!"); setTimeout(() => router.push("/me"), 1000); }
    else setMsg(data.error ?? "Save failed");
  }

  const handleColor = handleState === "available" ? "text-green-600" : handleState === "taken" ? "text-red-500" : handleState === "checking" ? "text-gray-400" : "text-gray-400";
  const handleHint = handleState === "available" ? "✓ Available" : handleState === "taken" ? "✗ Already taken" : handleState === "checking" ? "Checking…" : "3-30 chars, lowercase, numbers, _";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/me")} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{profile ? "Edit" : "Set up"} Network Profile</h1>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Handle *</label>
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <span className="pl-3 text-gray-400 text-sm">xplosale.com/n/</span>
              <input type="text" value={form.handle} onChange={(e) => set("handle", e.target.value)} required placeholder="yourhandle"
                className="flex-1 px-2 py-2 text-sm focus:outline-none bg-transparent" />
            </div>
            <p className={`text-xs mt-1 ${handleColor}`}>{handleHint}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
            <input type="text" value={form.headline} onChange={(e) => set("headline", e.target.value)} maxLength={160} placeholder="e.g. Software Engineer | Lahore"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Role</label>
            <input type="text" value={form.currentRole} onChange={(e) => set("currentRole", e.target.value)} maxLength={100} placeholder="e.g. Senior Engineer at Company"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={100} placeholder="e.g. Lahore, PK"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3} maxLength={2000} placeholder="Brief professional summary..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Visibility</label>
            <select value={form.visibility} onChange={(e) => set("visibility", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="PUBLIC">Public — anyone can view</option>
              <option value="CONNECTIONS">Connections only</option>
            </select>
          </div>
          {msg && <p className="text-sm text-blue-600">{msg}</p>}
          <button type="submit" disabled={saving || handleState === "taken"}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save Network Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
