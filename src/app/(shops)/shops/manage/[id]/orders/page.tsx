import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import OrdersManager from "@/components/shared/shops/OrdersManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ShopOrdersPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { id: shopId } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { ownerUserId: true, name: true, status: true },
  });

  if (!shop || shop.ownerUserId !== userId) redirect("/shops/manage");
  if (shop.status !== "ACTIVE") redirect(`/shops/manage/${shopId}`);

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href={`/shops/manage/${shopId}`}
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
        >
          ← {shop.name}
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "var(--ink)", margin: "0 0 6px" }}>
          Orders
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 28px" }}>
          Manage customer orders for {shop.name}
        </p>

        <OrdersManager shopId={shopId} />
      </div>
    </main>
  );
}
