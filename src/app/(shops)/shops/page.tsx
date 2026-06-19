import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getUserId } from "@/core/auth/session";
import ShopCard from "@/components/shared/shops/ShopCard";
import ShopsFilterBar from "@/components/shared/shops/ShopsFilterBar";
import CategorySidebar from "@/components/shared/shops/CategorySidebar";

export const metadata: Metadata = {
  title: "Shops Directory — Local Shops Near You | Xplosale",
  description: "Discover local shops in your city across Pakistan. Browse clothing, electronics, groceries and more — order online, pay cash, JazzCash or EasyPaisa.",
  alternates: { canonical: "/shops" },
  openGraph: {
    title: "Shops Directory — Local Shops Near You | Xplosale",
    description: "Discover local shops in your city across Pakistan. Order online, pay cash, JazzCash or EasyPaisa.",
    type: "website",
  },
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function ShopsDirectoryPage({ searchParams }: PageProps) {
  const [sp, session] = await Promise.all([searchParams, getSession()]);
  const q = sp.q?.trim() ?? "";
  const category = sp.category ?? "";
  const country = sp.country ?? "";
  const city = sp.city ?? "";
  const regionId = sp.regionId ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const regionFilter = regionId
    ? { regionId }
    : city && country
      ? { region: { city, country } }
      : country
        ? { region: { country } }
        : {};

  const where = {
    status: "ACTIVE" as const,
    ...(category ? { category } : {}),
    ...regionFilter,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Category counts for the sidebar nav
  const categoryCountsRaw = await prisma.shop.groupBy({
    by: ["category"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
  });
  const categoryCounts: Record<string, number> = Object.fromEntries(
    categoryCountsRaw.map((g) => [g.category, g._count._all])
  );

  const userId = session ? getUserId(session) : null;

  const [shops, total, favourites] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        region: { select: { name: true, city: true, country: true } },
        images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
        subscription: { select: { planKey: true, status: true } },
        _count: { select: { products: { where: { isHidden: false } } } },
      },
      orderBy: [
        { subscription: { planKey: "desc" } }, // PROMOTION → PREMIUM → FREE (alpha desc)
        { featured: "desc" },
        { createdAt: "desc" },
      ],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.shop.count({ where }),
    userId
      ? prisma.shopFavourite.findMany({ where: { userId }, select: { shopId: true } })
      : Promise.resolve([]),
  ]);

  const favouriteIds = new Set(favourites.map((f) => f.shopId));

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  function buildPageUrl(targetPage: number) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    if (country) p.set("country", country);
    if (city) p.set("city", city);
    if (regionId) p.set("regionId", regionId);
    if (targetPage > 1) p.set("page", String(targetPage));
    const qs = p.toString();
    return `/shops${qs ? `?${qs}` : ""}`;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div className="shop-layout" style={{ maxWidth: 1280, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start" }}>

        <CategorySidebar counts={categoryCounts} />

        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Hero */}
          <div className="reveal" style={{
            background: "linear-gradient(135deg, var(--paper-2), var(--paper-3))",
            border: "1px solid var(--line)",
            borderRadius: 20,
            padding: "clamp(20px,4vw,32px) clamp(20px,4vw,32px)",
            marginBottom: 20,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap",
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 6px" }}>
                Shops
              </p>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,3.2vw,32px)", color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.1 }}>
                Discover local shops near you
              </h1>
              <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: 0, fontFamily: "var(--body)" }}>
                {total > 0 ? `${total.toLocaleString()} shop${total !== 1 ? "s" : ""}` : "No shops"} {q || category || country || city || regionId ? "match your search" : "open for business"} · order online, pay your way
              </p>
            </div>
            <Link
              href={session ? "/shops/manage/new" : "/login?redirect=/shops/manage/new"}
              style={{
                padding: "11px 22px", background: "var(--clay)", color: "var(--white)",
                borderRadius: 11, fontSize: 14, fontWeight: 700, textDecoration: "none",
                fontFamily: "var(--body)", whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              List your shop free →
            </Link>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 24 }}>
            <ShopsFilterBar initialParams={{ q, category, country, city, regionId }} />
          </div>

          {/* Grid */}
          {shops.length === 0 ? (
            <div style={{
              background: "var(--white)", border: "1.5px dashed var(--line)", borderRadius: 18,
              padding: "56px 32px", textAlign: "center", fontFamily: "var(--body)",
            }}>
              <p style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 6 }}>No shops found.</p>
              <p style={{ fontSize: 14, color: "var(--ink-faint)" }}>Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="stagger" style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 36,
            }}>
              {shops.map((shop) => (
                <ShopCard
                  key={shop.id}
                  shop={shop}
                  shopId={shop.id}
                  isFavourite={favouriteIds.has(shop.id)}
                  isAuthenticated={!!session}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: "var(--body)" }}>
              {page > 1 && (
                <Link href={buildPageUrl(page - 1)} style={pageLinkStyle}>← Previous</Link>
              )}
              <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>
                Page {page} of {pages}
              </span>
              {page < pages && (
                <Link href={buildPageUrl(page + 1)} style={pageLinkStyle}>Next →</Link>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const pageLinkStyle: React.CSSProperties = {
  padding: "8px 16px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink-soft)",
  textDecoration: "none",
  fontFamily: "var(--body)",
};
