import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { slug },
    select: { name: true, description: true, category: true },
  });
  if (!shop) return { title: "Shop not found" };
  return {
    title: `${shop.name} — Xplosale Shops`,
    description: shop.description.slice(0, 160),
  };
}

export default async function ShopPublicPage({ params }: PageProps) {
  const { slug } = await params;

  const shop = await prisma.shop.findUnique({
    where: { slug },
    include: {
      region: { select: { name: true, city: true, country: true } },
      images: { orderBy: { order: "asc" } },
      products: {
        where: { isHidden: false },
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
        orderBy: { order: "asc" },
        take: 50,
      },
      subscription: { select: { planKey: true, status: true } },
    },
  });

  if (!shop || shop.status !== "ACTIVE") notFound();

  const isPremium = shop.subscription?.status === "ACTIVE" && shop.subscription?.planKey === "PREMIUM";
  const boardImg = shop.images.find((i) => i.kind === "STOREFRONT_BOARD")?.url ?? null;
  const generalImgs = shop.images.filter((i) => i.kind !== "STOREFRONT_BOARD");

  // Fire-and-forget VIEW analytics for PREMIUM shops
  if (isPremium) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    void prisma.$transaction(async (tx) => {
      const existing = await tx.shopAnalyticsEvent.findFirst({
        where: { shopId: shop.id, kind: "VIEW", day: today },
        select: { id: true },
      });
      if (existing) {
        await tx.shopAnalyticsEvent.update({ where: { id: existing.id }, data: { count: { increment: 1 } } });
      } else {
        await tx.shopAnalyticsEvent.create({ data: { shopId: shop.id, kind: "VIEW", day: today, count: 1 } });
      }
    }).catch(() => { /* analytics failure is non-fatal */ });
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(20px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <Link
          href="/shops"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}
        >
          ← Shops Directory
        </Link>

        {/* Storefront hero */}
        {boardImg && (
          <div style={{ width: "100%", height: "clamp(160px,30vw,300px)", borderRadius: 18, overflow: "hidden", marginBottom: 24, background: "var(--paper-2)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={boardImg} alt={`${shop.name} storefront`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Shop header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,34px)", color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>
                {shop.name}
              </h1>
              {shop.verifiedShop && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(15,184,126,.12)", color: "var(--green)" }}>
                  ✓ Verified Shop
                </span>
              )}
              {shop.featured && isPremium && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(217,119,6,.1)", color: "#d97706" }}>
                  ⭐ Featured
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
              {shop.category} · {shop.type} · {shop.region.name}, {shop.region.city}
            </p>
          </div>

          {/* Contact CTA */}
          {(shop.contactPhone || shop.website) && (
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              {shop.contactPhone && (
                <a
                  href={`tel:${shop.contactPhone}`}
                  style={{
                    padding: "9px 18px", background: "var(--clay)", color: "var(--white)",
                    borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
                  }}
                >
                  📞 Call
                </a>
              )}
              {shop.website && (
                <a
                  href={shop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "9px 18px", background: "transparent", color: "var(--ink-soft)",
                    border: "1px solid var(--line)", borderRadius: 10, fontSize: 13,
                    fontWeight: 600, textDecoration: "none",
                  }}
                >
                  🌐 Website
                </a>
              )}
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}>
          <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "0 0 12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {shop.description}
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
            📍 {shop.addressLine}, {shop.region.name}, {shop.region.city}
          </p>
        </div>

        {/* Extra photos */}
        {generalImgs.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".06em" }}>Photos</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {generalImgs.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt={shop.name}
                  style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Products */}
        {shop.products.length > 0 && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Products ({shop.products.length})
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}>
              {shop.products.map((product) => {
                const img = product.images[0]?.url ?? null;
                const priceLabel =
                  product.priceMin != null
                    ? product.priceMax != null && Number(product.priceMax) !== Number(product.priceMin)
                      ? `PKR ${Number(product.priceMin).toLocaleString()} – ${Number(product.priceMax).toLocaleString()}`
                      : `PKR ${Number(product.priceMin).toLocaleString()}`
                    : null;

                return (
                  <div
                    key={product.id}
                    style={{
                      background: "var(--white)", border: "1px solid var(--line)",
                      borderRadius: 12, overflow: "hidden",
                    }}
                  >
                    <div style={{ height: 120, background: "var(--paper-2)" }}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", margin: "0 0 4px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {product.name}
                      </p>
                      {priceLabel && (
                        <p style={{ fontSize: 12, color: "var(--clay)", fontWeight: 600, margin: 0 }}>{priceLabel}</p>
                      )}
                      {product.description && (
                        <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: "4px 0 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
