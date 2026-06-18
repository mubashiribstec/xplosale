"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import ShopForm from "@/components/shared/shops/ShopForm";
import StorefrontBoardUploader from "@/components/shared/shops/StorefrontBoardUploader";
import ProductsManager from "@/components/shared/shops/ProductsManager";
import ShopPaymentSettings from "@/components/shared/shops/ShopPaymentSettings";
import ShopSetupChecklist from "@/components/shared/shops/ShopSetupChecklist";
import WorkingHoursEditor from "@/components/shared/shops/WorkingHoursEditor";

interface ShopImage {
  id: string;
  url: string;
  kind: string;
}

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
  images: ShopImage[];
  subscription: { planKey: string; status: string; currentPeriodEnd: string | null } | null;
  bankName: string | null;
  bankAccountTitle: string | null;
  bankAccountNumber: string | null;
  jazzcashNumber: string | null;
  easipaisaNumber: string | null;
  acceptsCash: boolean;
  acceptsDelivery: boolean;
  deliveryNotes: string | null;
  workingHours: Record<string, string> | null;
  _count?: { products: number };
}

interface PlanData {
  maxProducts: number;
  maxImagesPerProduct: number;
  key: string;
}

export default function EditShopPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: authSession } = useSession();
  const isAdmin = (authSession?.user as { role?: string } | undefined)?.role === "ADMIN";
  const [shop, setShop] = useState<ShopData | null>(null);
  const [plan, setPlan] = useState<PlanData>({ maxProducts: 2, maxImagesPerProduct: 2, key: "FREE" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitDone, setSubmitDone] = useState(false);
  const [storefrontImage, setStorefrontImage] = useState<{ id: string; url: string } | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [hours, setHours] = useState<Record<string, string>>({});
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const [shopRes, planRes] = await Promise.all([
        fetch(`/api/shops/${id}`),
        fetch(`/api/shops/${id}/plan`),
      ]);
      if (!shopRes.ok) { router.push("/shops/manage"); return; }
      const shopJson = await shopRes.json() as { data: ShopData };
      setShop(shopJson.data);
      const board = shopJson.data.images?.find((i) => i.kind === "STOREFRONT_BOARD") ?? null;
      setStorefrontImage(board);
      setProductCount(shopJson.data._count?.products ?? 0);
      setHours(shopJson.data.workingHours ?? {});

      if (planRes.ok) {
        const planJson = await planRes.json() as { data: PlanData };
        if (planJson.data) setPlan(planJson.data);
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
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

  async function handleSaveHours() {
    if (!shop) return;
    setHoursSaving(true);
    setHoursSaved(false);
    try {
      const cleaned = Object.fromEntries(Object.entries(hours).filter(([, v]) => v.trim() !== ""));
      const res = await fetch(`/api/shops/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours: Object.keys(cleaned).length > 0 ? cleaned : null }),
      });
      if (res.ok) {
        setHoursSaved(true);
        setTimeout(() => setHoursSaved(false), 2500);
      }
    } finally {
      setHoursSaving(false);
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

  const canEdit = isAdmin || shop.status === "DRAFT" || shop.status === "REJECTED";
  const canSubmit = !isAdmin && (shop.status === "DRAFT" || shop.status === "REJECTED");
  const isActive = shop.status === "ACTIVE";
  const hasStorefront = !!storefrontImage;
  const isPremium = shop.subscription?.status === "ACTIVE" &&
    (shop.subscription?.planKey === "PREMIUM" || shop.subscription?.planKey === "PROMOTION");
  const isPromotion = shop.subscription?.status === "ACTIVE" && shop.subscription?.planKey === "PROMOTION";

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <Link
          href="/shops/manage"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← My Shops
        </Link>

        {isAdmin && (
          <div style={{
            background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10,
            padding: "8px 14px", marginBottom: 16, fontSize: 12, fontWeight: 600, color: "#92400e",
            fontFamily: "var(--body)",
          }}>
            🛠 Admin mode — you can edit this shop&apos;s details regardless of its status.
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(24px,4vw,34px)", color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>
            {shop.name}
          </h1>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
            background: "var(--paper-2)", color: shop.status === "ACTIVE" ? "var(--green)" : shop.status === "PENDING_REVIEW" ? "#d97706" : "var(--ink-faint)",
          }}>
            {shop.status.replace(/_/g, " ")}
          </span>
        </div>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 36px", fontFamily: "var(--body)" }}>
          {isActive ? "Your shop is live. Manage products, orders, and payment settings below." : canEdit ? "Edit your shop details below." : "This shop cannot be edited in its current status."}
        </p>

        {/* Quick links for active shops */}
        {isActive && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <Link
              href={`/shops/manage/${shop.id}/orders`}
              style={{
                padding: "9px 18px", background: "var(--clay)", color: "var(--white)",
                borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              📦 Manage Orders
            </Link>
            <Link
              href={`/shops/manage/${shop.id}/analytics`}
              style={{
                padding: "9px 18px", background: "transparent", color: "var(--ink-soft)",
                border: "1px solid var(--line)", borderRadius: 10, fontSize: 13,
                fontWeight: 600, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              📊 Analytics
            </Link>
            <Link
              href={`/shops/manage/${shop.id}/poster`}
              style={{
                padding: "9px 18px", background: "transparent", color: "var(--ink-soft)",
                border: "1px solid var(--line)", borderRadius: 10, fontSize: 13,
                fontWeight: 600, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              🖨 QR Poster
            </Link>
            <Link
              href={`/shops/${shop.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "9px 18px", background: "transparent", color: "var(--ink-soft)",
                border: "1px solid var(--line)", borderRadius: 10, fontSize: 13,
                fontWeight: 600, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              🌐 View Shop ↗
            </Link>
          </div>
        )}

        {/* Setup checklist (DRAFT / REJECTED) */}
        <ShopSetupChecklist
          status={shop.status}
          hasStorefront={hasStorefront}
          productCount={productCount}
          hasPayment={shop.acceptsCash || !!shop.bankAccountNumber || !!shop.jazzcashNumber || !!shop.easipaisaNumber}
          hasWorkingHours={Object.values(hours).some((v) => v.trim() !== "")}
        />

        {/* Storefront photo */}
        <div id="storefront" style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(20px,4vw,32px)", marginBottom: 16 }}>
          <StorefrontBoardUploader
            shopId={shop.id}
            currentUrl={storefrontImage?.url}
            currentImageId={storefrontImage?.id}
            onUpdate={(img) => setStorefrontImage(img)}
          />
        </div>

        {/* Shop details form (DRAFT / REJECTED only) */}
        {canEdit && (
          <div id="details" style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(24px,4vw,40px)", marginBottom: 16 }}>
            <ShopForm initialData={shop} />
          </div>
        )}

        {/* Working hours (all statuses) */}
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(20px,4vw,32px)", marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setHoursOpen((v) => !v)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "var(--body)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)" }}>
              🕐 Working Hours{" "}
              <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>
                {Object.values(hours).some((v) => v.trim()) ? "" : "(not set)"}
              </span>
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-faint)", transform: hoursOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▸</span>
          </button>
          {hoursOpen && (
            <div style={{ marginTop: 16 }}>
              <WorkingHoursEditor value={hours} onChange={setHours} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => void handleSaveHours()}
                  disabled={hoursSaving}
                  style={{
                    padding: "9px 22px", background: "var(--clay)", color: "var(--white)", border: "none",
                    borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "var(--body)",
                    cursor: hoursSaving ? "not-allowed" : "pointer", opacity: hoursSaving ? 0.6 : 1,
                  }}
                >
                  {hoursSaving ? "Saving…" : "Save hours"}
                </button>
                {hoursSaved && <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>✓ Saved</span>}
              </div>
            </div>
          )}
        </div>

        {/* Products — shown for DRAFT/REJECTED and ACTIVE shops */}
        {(canEdit || isActive) && (
          <div id="products" style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(20px,4vw,32px)", marginBottom: 16 }}>
            <ProductsManager
              shopId={shop.id}
              maxProducts={plan.maxProducts}
              maxImagesPerProduct={plan.maxImagesPerProduct}
              planKey={plan.key}
              onProductsChange={setProductCount}
            />
          </div>
        )}

        {/* Payment settings (all statuses) */}
        <div id="payments" style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "clamp(20px,4vw,32px)", marginBottom: 16 }}>
          <ShopPaymentSettings
            shopId={shop.id}
            initial={{
              bankName: shop.bankName,
              bankAccountTitle: shop.bankAccountTitle,
              bankAccountNumber: shop.bankAccountNumber,
              jazzcashNumber: shop.jazzcashNumber,
              easipaisaNumber: shop.easipaisaNumber,
              acceptsCash: shop.acceptsCash,
              acceptsDelivery: shop.acceptsDelivery,
              deliveryNotes: shop.deliveryNotes,
            }}
          />
        </div>

        {/* Subscription banner */}
        {(() => {
          if (isPremium) {
            const end = shop.subscription?.currentPeriodEnd;
            return (
              <div style={{ background: isPromotion ? "rgba(124,58,237,.05)" : "rgba(15,184,126,.05)", border: `1px solid ${isPromotion ? "rgba(124,58,237,.3)" : "var(--green)"}`, borderRadius: 14, padding: "14px 18px", marginBottom: 16, fontFamily: "var(--body)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <p style={{ fontSize: 13, color: isPromotion ? "#7c3aed" : "var(--green)", fontWeight: 600, margin: 0 }}>
                  {isPromotion ? "🔥" : "✓"} {isPromotion ? "Promotion" : "Premium"} plan active{end ? ` · renews ${new Date(end).toLocaleDateString()}` : ""}
                </p>
                <Link href={`/shops/manage/${shop.id}/upgrade`} style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none" }}>Manage →</Link>
              </div>
            );
          }
          return (
            <div style={{ background: "rgba(160,78,55,.05)", border: "1px solid var(--clay)", borderRadius: 14, padding: "14px 18px", marginBottom: 16, fontFamily: "var(--body)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>
                Free plan · {plan.maxProducts} products max · {plan.maxImagesPerProduct} images per product
              </p>
              <Link href={`/shops/manage/${shop.id}/upgrade`} style={{ fontSize: 13, fontWeight: 600, color: "var(--clay)", textDecoration: "none" }}>Upgrade →</Link>
            </div>
          );
        })()}

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
              </p>
            </div>
            {!hasStorefront && (
              <p style={{ fontSize: 13, color: "#d97706", margin: 0 }}>
                ⚠ Upload a storefront photo above before submitting.
              </p>
            )}
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
                disabled={submitting || !hasStorefront}
                style={{
                  padding: "10px 24px", background: "var(--green)", color: "var(--white)", border: "none",
                  borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "var(--body)",
                  cursor: (submitting || !hasStorefront) ? "not-allowed" : "pointer",
                  opacity: (submitting || !hasStorefront) ? 0.5 : 1,
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
