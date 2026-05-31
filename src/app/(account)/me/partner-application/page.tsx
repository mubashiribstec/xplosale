"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

type PartnerType = "INDIVIDUAL" | "BUSINESS" | "AGENCY";

type ExistingApp = {
  id: string;
  partnerType: PartnerType;
  businessName: string | null;
  website: string | null;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
};

export default function PartnerApplicationPage() {
  const router = useRouter();
  const [existing, setExisting] = useState<ExistingApp | null | undefined>(undefined);
  const [partnerType, setPartnerType] = useState<PartnerType>("INDIVIDUAL");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/account/partner-application")
      .then((r) => r.json())
      .then((j: { data: ExistingApp | null }) => setExisting(j.data))
      .catch(() => setExisting(null));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/account/partner-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerType, businessName: businessName || undefined, website: website || undefined, description }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Submission failed");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (existing === undefined) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (success || existing?.status === "APPROVED") {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
          <VerifiedBadge tier="PARTNER" size="md" />
          <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2">
            {existing?.status === "APPROVED" ? "You're a Verified Partner!" : "Application Submitted"}
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            {existing?.status === "APPROVED"
              ? "Your partner status is active. Your listings are now featured in search results."
              : "Your application is under review. You'll be notified once it's approved (usually within 48 hours)."}
          </p>
          <button onClick={() => router.push("/me")} className="text-sm text-blue-600 hover:underline">
            Back to My Account
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Apply for Partner Status</h1>
          <VerifiedBadge tier="PARTNER" size="sm" />
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Partner status gives your listings featured placement, a gold badge, and higher posting limits.
          Identity verification is required before applying.
        </p>

        {existing?.status === "PENDING" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-amber-700">
              Your application is currently <strong>pending review</strong>. You can update and resubmit if needed.
            </p>
          </div>
        )}

        {existing?.status === "REJECTED" && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-sm text-red-700">
              Your previous application was <strong>rejected</strong>.
              {existing.reason ? ` Reason: ${existing.reason}.` : ""} You may resubmit below.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(["INDIVIDUAL", "BUSINESS", "AGENCY"] as PartnerType[]).map((pt) => (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setPartnerType(pt)}
                    className={`py-2 text-sm font-medium rounded-lg border transition-colors ${
                      partnerType === pt
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {pt === "INDIVIDUAL" ? "Individual" : pt === "BUSINESS" ? "Business" : "Agency"}
                  </button>
                ))}
              </div>
            </div>

            {partnerType !== "INDIVIDUAL" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business / Agency Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your company name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tell us about your business <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                minLength={20}
                placeholder="Describe your business, how long you've been operating, and why you'd like partner status…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{description.length}/2000</p>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || description.length < 20}
            className="w-full py-2.5 px-4 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Submitting…" : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}
