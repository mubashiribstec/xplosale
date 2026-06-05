"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ShopForm from "@/components/shared/shops/ShopForm";

interface ShopData {
  id: string;
  name: string;
  category: string;
  type: string;
  description: string;
  addressLine: string;
  regionId: string;
  website: string | null;
  contactPhone: string | null;
  status: string;
  verifiedShop: boolean;
  slug: string;
}

export default function EditShopPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitDone, setSubmitDone] = useState(false);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${id}`);
      if (!res.ok) { router.push("/shops/manage"); return; }
      const json = await res.json() as { data: ShopData };
      setShop(json.data);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { void fetchShop(); }, [fetchShop]);

  async function handleSubmitForReview() {
    if (!shop) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/shops/${shop.id}/submit`, { method: "POST" });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) { setSubmitError(json.error ?? "Submission failed."); return; }
      setSubmitDone(true);
      setTimeout(() => router.push("/shops/manage"), 1500);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-faint)", fontFamily: "var(--body)" }}>Loading…</p>
      </main>
    );
  }

  if (!shop) return null;

  const canEdit = shop.status === "DRAFT" || shop.status === "REJECTED";
  const canSubmit = shop.status === "DRAFT" || shop.status === "REJECTED";

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href="/shops/manage"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← My Shops
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(24px,4vw,34px)", color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>
            {shop.name}
          </h1>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
            background: "var(--paper-2)", color: shop.status === "ACTIVE" ? "var(--green)" : shop.status === "PENDING_REVIEW" ? "#d97706" : "var(--ink-faint)",
          }}>
            {shop.status.replace("_", " ")}
          </span>
        </div>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 36px", fontFamily: "var(--body)" }}>
          {canEdit ? "Edit your shop details below." : "This shop cannot be edited in its current status."}
        </p>

        {canEdit && (
          <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(24px,4vw,40px)", marginBottom: 24 }}>
            <ShopForm initialData={shop} />
          </div>
        )}

        {/* Submit for review */}
        {canSubmit && (
          <div style={{
            background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 24px",
            fontFamily: "var(--body)", display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: "0 0 4px" }}>Submit for Review</p>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
                Once submitted, our team will review your shop and activate it within 24 hours.
                {" "}Phase B: you&rsquo;ll need to add a storefront photo before submitting.
              </p>
            </div>
            {submitError && (
              <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{submitError}</p>
            )}
            {submitDone ? (
              <p style={{ fontSize: 14, color: "var(--green)", fontWeight: 600 }}>
                Submitted! Redirecting…
              </p>
            ) : (
              <button
                onClick={() => void handleSubmitForReview()}
                disabled={submitting}
                style={{
                  padding: "10px 24px", background: "var(--green)", color: "var(--white)", border: "none",
                  borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "var(--body)",
                  cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.6 : 1,
                  alignSelf: "flex-start",
                }}
              >
                {submitting ? "Submitting…" : "Submit for Review"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
