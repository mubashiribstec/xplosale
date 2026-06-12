import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getUserId } from "@/core/auth/session";
import { serializeJsonLd } from "@/lib/json-ld";
import { waShareUrl } from "@/lib/whatsapp";
import BuyButton from "@/components/shared/shops/BuyButton";
import ProductGallery from "@/components/shared/shops/ProductGallery";
import ShareButton from "@/components/shared/ShareButton";

interface PageProps {
  params: Promise<{ slug: string; productId: string }>;
}

function priceLabel(priceMin: unknown, priceMax: unknown): string | null {
  if (priceMin == null) return null;
  const min = Number(priceMin);
  if (priceMax != null && Number(priceMax) !== min) {
    return `PKR ${min.toLocaleString()} – ${Number(priceMax).toLocaleString()}`;
  }
  return `PKR ${min.toLocaleString()}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, productId } = await params;
  const product = await prisma.shopProduct.findFirst({
    where: { id: productId, isHidden: false, shop: { slug, status: "ACTIVE" } },
    select: {
      name: true, description: true, priceMin: true, priceMax: true,
      images: { orderBy: { order: "asc" }, take: 1, select: { url: true } },
      shop: { select: { name: true, images: { where: { kind: "STOREFRONT_BOARD" }, take: 1, select: { url: true } } } },
    },
  });
  if (!product) return { title: "Product not found" };

  const price = priceLabel(product.priceMin, product.priceMax);
  const description = (product.description ?? `${product.name} available at ${product.shop.name} on Xplosale.`).slice(0, 160);
  const img = product.images[0]?.url ?? product.shop.images[0]?.url;

  return {
    title: `${product.name}${price ? ` — ${price}` : ""} | ${product.shop.name} | Xplosale`,
    description,
    alternates: { canonical: `/shops/${slug}/p/${productId}` },
    openGraph: {
      title: `${product.name} — ${product.shop.name}`,
      description,
      type: "website",
      images: img ? [img] : undefined,
    },
    twitter: {
      card: img ? "summary_large_image" : "summary",
      title: `${product.name} — ${product.shop.name}`,
      description,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug, productId } = await params;

  const [session, product] = await Promise.all([
    getSession(),
    prisma.shopProduct.findFirst({
      where: { id: productId, isHidden: false, shop: { slug, status: "ACTIVE" } },
      include: {
        images: { orderBy: { order: "asc" } },
        shop: {
          include: {
            region: { select: { name: true, city: true } },
            images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
            subscription: { select: { planKey: true, status: true } },
            products: {
              where: { isHidden: false, id: { not: productId } },
              include: { images: { orderBy: { order: "asc" }, take: 1 } },
              orderBy: { order: "asc" },
              take: 4,
            },
          },
        },
      },
    }),
  ]);

  if (!product) notFound();
  const shop = product.shop;

  const isPremium = shop.subscription?.status === "ACTIVE" &&
    (shop.subscription?.planKey === "PREMIUM" || shop.subscription?.planKey === "PROMOTION");

  const currentUserId = session ? getUserId(session) : null;
  const isOwner = currentUserId === shop.ownerUserId;
  const isAuthenticated = !!session;

  const price = priceLabel(product.priceMin, product.priceMax);
  const lowStock = product.inStock && product.stockCount != null && product.stockCount > 0 && product.stockCount <= 5;

  const capabilities = {
    acceptsCash: shop.acceptsCash,
    acceptsDelivery: shop.acceptsDelivery,
    bankName: shop.bankName,
    bankAccountTitle: shop.bankAccountTitle,
    bankAccountNumber: shop.bankAccountNumber,
    jazzcashNumber: shop.jazzcashNumber,
    easipaisaNumber: shop.easipaisaNumber,
    deliveryNotes: shop.deliveryNotes,
  };
  const hasPayment = shop.acceptsCash || !!shop.bankAccountNumber || !!shop.jazzcashNumber || !!shop.easipaisaNumber;

  // Fire-and-forget PRODUCT_CLICK analytics for premium shops
  if (isPremium) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    void prisma.$transaction(async (tx) => {
      const existing = await tx.shopAnalyticsEvent.findFirst({
        where: { shopId: shop.id, kind: "PRODUCT_CLICK", productId: product.id, day: today },
        select: { id: true },
      });
      if (existing) {
        await tx.shopAnalyticsEvent.update({ where: { id: existing.id }, data: { count: { increment: 1 } } });
      } else {
        await tx.shopAnalyticsEvent.create({ data: { shopId: shop.id, kind: "PRODUCT_CLICK", productId: product.id, day: today, count: 1 } });
      }
    }).catch(() => { /* non-fatal */ });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.xplosale.com";
  const productUrl = `${base}/shops/${shop.slug}/p/${product.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    ...(product.images.length > 0 ? { image: product.images.map((i) => i.url) } : {}),
    url: productUrl,
    ...(product.priceMin != null ? {
      offers: {
        "@type": "Offer",
        priceCurrency: "PKR",
        price: Number(product.priceMin),
        availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: productUrl,
        seller: { "@type": "LocalBusiness", name: shop.name },
      },
    } : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shops", item: `${base}/shops` },
      { "@type": "ListItem", position: 2, name: shop.name, item: `${base}/shops/${shop.slug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl },
    ],
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(20px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />

      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 22, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <Link href="/shops" style={{ color: "var(--ink-faint)", textDecoration: "none" }}>Shops</Link>
          <span>›</span>
          <Link href={`/shops/${shop.slug}`} style={{ color: "var(--ink-faint)", textDecoration: "none" }}>{shop.name}</Link>
          <span>›</span>
          <span style={{ color: "var(--ink-soft)" }}>{product.name}</span>
        </nav>

        <div className="pd-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(20px,4vw,36px)", alignItems: "start" }}>

          {/* Gallery */}
          <ProductGallery images={product.images.map((i) => ({ url: i.url }))} alt={product.name} />

          {/* Details */}
          <div>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,32px)", color: "var(--ink)", margin: "0 0 10px", lineHeight: 1.15 }}>
              {product.name}
            </h1>

            {price && (
              <p style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, color: "var(--clay)", margin: "0 0 10px" }} className="mono">
                {price}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {product.inStock ? (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(15,184,126,.12)", color: "var(--green)" }}>
                  ✓ In stock
                </span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(160,78,55,.1)", color: "var(--clay)" }}>
                  Out of stock
                </span>
              )}
              {lowStock && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(217,119,6,.1)", color: "#d97706" }}>
                  Only {product.stockCount} left
                </span>
              )}
            </div>

            {product.description && (
              <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "0 0 20px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {product.description}
              </p>
            )}

            {hasPayment && !isOwner && product.inStock && (
              <div style={{ marginBottom: 14 }}>
                <BuyButton
                  shopId={shop.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    priceMin: product.priceMin ? Number(product.priceMin) : null,
                  }}
                  capabilities={capabilities}
                  isAuthenticated={isAuthenticated}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <a
                href={waShareUrl(`${product.name}${price ? ` (${price})` : ""} at ${shop.name} — ${productUrl}`)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 16px", background: "#25D366", color: "#fff", borderRadius: 10,
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                💬 Share on WhatsApp
              </a>
              <ShareButton url={`/shops/${shop.slug}/p/${product.id}`} title={product.name} text={`${product.name} at ${shop.name} on Xplosale`} />
            </div>

            {/* Shop mini-card */}
            <Link
              href={`/shops/${shop.slug}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, marginTop: 24,
                padding: "12px 14px", background: "var(--white)", border: "1px solid var(--line)",
                borderRadius: 14, textDecoration: "none",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "var(--paper-2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {shop.images[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.images[0].url} alt={shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : "🏪"}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {shop.name} {shop.verifiedShop && <span style={{ color: "var(--green)" }}>✓</span>}
                </p>
                <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                  {shop.category} · {shop.region.name}, {shop.region.city}
                </p>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--clay)", fontWeight: 600, flexShrink: 0 }}>Visit →</span>
            </Link>
          </div>
        </div>

        {/* More from this shop */}
        {shop.products.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: ".06em" }}>
              More from {shop.name}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
              {shop.products.map((p) => {
                const pPrice = priceLabel(p.priceMin, p.priceMax);
                return (
                  <Link
                    key={p.id}
                    href={`/shops/${shop.slug}/p/${p.id}`}
                    className="card-hover"
                    style={{
                      background: "var(--white)", border: "1px solid var(--line)", borderRadius: 12,
                      overflow: "hidden", textDecoration: "none",
                    }}
                  >
                    <div style={{ height: 110, background: "var(--paper-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
                      {p.images[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : "🛍️"}
                    </div>
                    <div style={{ padding: "9px 11px" }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", margin: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {p.name}
                      </p>
                      {pPrice && <p style={{ fontSize: 12, color: "var(--clay)", fontWeight: 600, margin: "3px 0 0" }}>{pPrice}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 720px) {
          .pd-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
