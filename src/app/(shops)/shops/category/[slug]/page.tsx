import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getUserId } from "@/core/auth/session";
import { CATEGORY_BY_SLUG } from "@/lib/shop-categories";
import ShopCard from "@/components/shared/shops/ShopCard";

const PAGE_SIZE = 20;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORY_BY_SLUG[slug];
  if (!cat) return {};
  const title = `${cat.label} Shops — Xplosale`;
  const description = `${cat.description} Browse verified ${cat.label.toLowerCase()} shops near you.`;
  return {
    title,
    description,
    alternates: { canonical: `/shops/category/${slug}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;

  const cat = CATEGORY_BY_SLUG[slug];
  if (!cat) notFound();

  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);

  const where = {
    status: "ACTIVE" as const,
    category: cat.label,
  };

  const session = await getSession();
  const userId = session ? getUserId(session) : null;

  const [shops, total, favourites] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        region:       { select: { name: true, city: true, country: true } },
        images:       { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
        subscription: { select: { planKey: true, status: true } },
        _count:       { select: { products: { where: { isHidden: false } } } },
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

  function buildPageUrl(n: number) {
    return n > 1
      ? `/shops/category/${slug}?page=${n}`
      : `/shops/category/${slug}`;
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 24, fontFamily: "var(--body)" }}>
          <Link href="/shops" style={{ color: "var(--ink-faint)", textDecoration: "none" }}>
            Shops
          </Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: "var(--ink-soft)" }}>{cat.label}</span>
        </nav>

        {/* Hero */}
        <div style={{
          background: `color-mix(in srgb, ${cat.accent} 8%, var(--white))`,
          border: `1.5px solid color-mix(in srgb, ${cat.accent} 20%, var(--line))`,
          borderRadius: 20,
          padding: "28px 32px",
          marginBottom: 36,
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}>
          <span style={{ fontSize: 56, lineHeight: 1, flexShrink: 0 }}>{cat.icon}</span>
          <div>
            <h1 style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: "clamp(22px,3.5vw,36px)",
              color: "var(--ink)",
              margin: "0 0 6px",
              lineHeight: 1.1,
            }}>
              {cat.label}
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "0 0 8px", fontFamily: "var(--body)" }}>
              {cat.description}
            </p>
            <p style={{ fontSize: 13, color: cat.accent, fontWeight: 600, margin: 0, fontFamily: "var(--body)" }}>
              {total > 0
                ? `${total.toLocaleString()} shop${total !== 1 ? "s" : ""} found`
                : "No shops yet — be the first to list!"}
            </p>
          </div>
        </div>

        {/* Grid */}
        {shops.length === 0 ? (
          <div style={{
            background: "var(--white)", border: "1.5px dashed var(--line)", borderRadius: 18,
            padding: "56px 32px", textAlign: "center", fontFamily: "var(--body)",
          }}>
            <p style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 6 }}>No shops in this category yet.</p>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", marginBottom: 20 }}>
              Own a {cat.label.toLowerCase()} shop?
            </p>
            <Link
              href="/shops/manage/new"
              style={{
                display: "inline-block", padding: "12px 24px",
                background: cat.accent, color: "#fff", borderRadius: 12,
                fontSize: 14, fontWeight: 600, textDecoration: "none",
                fontFamily: "var(--body)",
              }}
            >
              List your shop →
            </Link>
          </div>
        ) : (
          <div className="stagger" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
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

        {/* Back link */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link href="/shops" style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", fontFamily: "var(--body)" }}>
            ← Back to all shops
          </Link>
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
