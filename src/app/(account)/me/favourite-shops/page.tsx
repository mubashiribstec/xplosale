import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import ShopCard from "@/components/shared/shops/ShopCard";

export const metadata: Metadata = {
  title: "Favourite Shops — Xplosale",
  robots: { index: false, follow: false },
};

export default async function FavouriteShopsPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/me/favourite-shops");
  const userId = getUserId(session);

  const favourites = await prisma.shopFavourite.findMany({
    where: { userId, shop: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      shop: {
        include: {
          region: { select: { name: true, city: true, country: true } },
          images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
          subscription: { select: { planKey: true, status: true } },
          _count: { select: { products: { where: { isHidden: false } } } },
        },
      },
    },
  });

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "var(--ink)", margin: "0 0 6px" }}>
          Favourite Shops
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 28px" }}>
          {favourites.length} shop{favourites.length !== 1 ? "s" : ""} saved
        </p>

        {favourites.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🤍</p>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "0 0 16px" }}>
              No favourite shops yet. Tap the heart on any shop to save it here.
            </p>
            <Link
              href="/shops"
              style={{
                padding: "10px 24px", background: "var(--clay)", color: "var(--white)",
                borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: "none",
              }}
            >
              Browse Shops
            </Link>
          </div>
        ) : (
          <div className="stagger" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}>
            {favourites.map((f) => (
              <ShopCard
                key={f.shopId}
                shop={f.shop}
                shopId={f.shopId}
                isFavourite
                isAuthenticated
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
