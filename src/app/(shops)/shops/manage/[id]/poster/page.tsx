import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getUserId } from "@/core/auth/session";
import { qrSvg } from "@/lib/qr";
import PrintButton from "@/components/shared/shops/PrintButton";

export const metadata: Metadata = {
  title: "Shop QR Poster — Xplosale",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShopPosterPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=/shops/manage/${id}/poster`);
  const userId = getUserId(session);
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const shop = await prisma.shop.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, category: true, status: true, ownerUserId: true,
      region: { select: { city: true } },
    },
  });
  if (!shop) notFound();
  if (shop.ownerUserId !== userId && !isAdmin) notFound();

  if (shop.status !== "ACTIVE") {
    return (
      <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 40, margin: "40px 0 12px" }}>🖨</p>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 24, color: "var(--ink)", margin: "0 0 8px" }}>
            Activate your shop first
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 20px" }}>
            The QR poster links to your live shop page, so it becomes available once your shop is approved and active.
          </p>
          <Link href={`/shops/manage/${shop.id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--clay)", textDecoration: "none" }}>
            ← Back to shop setup
          </Link>
        </div>
      </main>
    );
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.xplosale.com";
  const shopUrl = `${base}/shops/${shop.slug}`;
  const displayUrl = shopUrl.replace(/^https?:\/\//, "");
  const svg = qrSvg(shopUrl, { moduleSize: 8, margin: 2 });

  return (
    <main className="print-page" style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Instructions (hidden when printing) */}
        <div className="no-print" style={{ marginBottom: 24 }}>
          <Link href={`/shops/manage/${shop.id}`} style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
            ← {shop.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,28px)", color: "var(--ink)", margin: "0 0 4px" }}>
                Your shop QR poster
              </h1>
              <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5, maxWidth: 380 }}>
                Print this and place it at your counter, shop door, or delivery packets. Customers scan it to see your products and order online.
              </p>
            </div>
            <PrintButton />
          </div>
        </div>

        {/* The poster */}
        <div style={{
          background: "#FFFFFF",
          border: "1px solid var(--line)",
          borderRadius: 24,
          padding: "clamp(32px,6vw,56px) clamp(24px,5vw,48px)",
          textAlign: "center",
          boxShadow: "var(--shadow-lg)",
        }}>
          <p className="eyebrow" style={{ color: "#A04E37", margin: "0 0 10px" }}>Xplosale</p>
          <h2 style={{
            fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(26px,5vw,40px)",
            color: "#1A1613", margin: "0 0 6px", lineHeight: 1.1, wordBreak: "break-word",
          }}>
            {shop.name}
          </h2>
          <p style={{ fontSize: 15, color: "#7A7167", margin: "0 0 28px" }}>
            {shop.category} · {shop.region.city}
          </p>

          <div
            style={{ display: "inline-block", padding: 12, background: "#FFFFFF", border: "2px solid #1A1613", borderRadius: 16 }}
            dangerouslySetInnerHTML={{ __html: svg.replace("<svg ", '<svg style="display:block;width:280px;height:280px" ') }}
          />

          <p className="mono" style={{ fontSize: 15, fontWeight: 700, color: "#1A1613", margin: "18px 0 4px", wordBreak: "break-all" }}>
            {displayUrl}
          </p>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#3D362F", margin: "14px 0 4px" }}>
            Scan to see our products &amp; order online
          </p>
          <p style={{ fontSize: 17, color: "#3D362F", margin: 0 }} dir="rtl" lang="ur">
            اسکین کریں اور آن لائن آرڈر کریں
          </p>
        </div>

        <p className="no-print" style={{ fontSize: 12, color: "var(--ink-faint)", textAlign: "center", margin: "16px 0 0" }}>
          Tip: print on A4, cut around the card, and laminate it so it lasts.
        </p>
      </div>
    </main>
  );
}
