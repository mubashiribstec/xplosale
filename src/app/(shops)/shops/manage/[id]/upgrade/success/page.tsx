import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UpgradeSuccessPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { id: shopId } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { ownerUserId: true, name: true },
  });
  if (!shop || shop.ownerUserId !== userId) redirect("/shops/manage");

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center", fontFamily: "var(--body)" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "var(--ink)", margin: "0 0 10px" }}>
          You&rsquo;re on Premium!
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 32px", lineHeight: 1.6 }}>
          <strong>{shop.name}</strong> now has access to 30 products, 5 images per product, featured placement, and analytics.
        </p>
        <Link
          href={`/shops/manage/${shopId}`}
          style={{
            display: "inline-block", padding: "12px 28px",
            background: "var(--clay)", color: "var(--white)",
            borderRadius: 12, fontSize: 15, fontWeight: 600, textDecoration: "none",
          }}
        >
          Back to Shop
        </Link>
      </div>
    </main>
  );
}
