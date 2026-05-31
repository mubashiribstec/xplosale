"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type SellerProfile = {
  bio: string | null;
  agentTier: "NONE" | "BASIC" | "PRO";
};

export default function SellerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [bio, setBio] = useState("");
  const [agentTier, setAgentTier] = useState<"NONE" | "BASIC" | "PRO">("NONE");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/account/profile/seller")
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setBio(data.bio ?? "");
          setAgentTier(data.agentTier ?? "NONE");
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/account/profile/seller", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio, agentTier }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setProfile(data.data);
      setMsg("Saved!");
      setTimeout(() => router.push("/me"), 1000);
    } else {
      setMsg(data.error ?? "Save failed");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.push("/me")} className="text-sm text-gray-400 hover:text-gray-600 mb-4">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {profile ? "Edit" : "Set up"} Seller Profile
        </h1>
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Tell buyers about yourself..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent Tier</label>
            <select
              value={agentTier}
              onChange={(e) => setAgentTier(e.target.value as "NONE" | "BASIC" | "PRO")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NONE">None (regular seller)</option>
              <option value="BASIC">Basic Agent</option>
              <option value="PRO">Pro Agent</option>
            </select>
          </div>
          {msg && <p className="text-sm text-blue-600">{msg}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Save Seller Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
