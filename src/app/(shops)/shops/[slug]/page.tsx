import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getUserId } from "@/core/auth/session";
import { serializeJsonLd } from "@/lib/json-ld";
import BuyButton from "@/components/shared/shops/BuyButton";
import MessageShopButton from "@/components/shared/shops/MessageShopButton";
import ReportShopButton from "@/components/shared/shops/ReportShopButton";
import ShopReviews from "@/components/shared/shops/ShopReviews";
import ShopContactActions from "@/components/shared/shops/ShopContactActions";
import FavouriteButton from "@/components/shared/shops/FavouriteButton";
import ShareButton from "@/components/shared/ShareButton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const shop = await prisma.shop.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      category: true,
      region: { select: { city: true } },
      images: { where: { kind: "STOREFRONT_BOARD" }, take: 1, select: { url: true } },
    },
  });
  if (!shop) return { title: "Shop not found" };

  const title = `${shop.name} — ${shop.category} in ${shop.region.city} | Xplosale Shops`;
  const description = shop.description.slice(0, 160);
  const boardImg = shop.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `/shops/${slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: boardImg ? [boardImg] : undefined,
    },
    twitter: {
      card: boardImg ? "summary_large_image" : "summary",
      title,
      description,
    },
  };
}

export default async function ShopPublicPage({ params }: PageProps) {
  const { slug } = await params;

  const [session, shop] = await Promise.all([
    getSession(),
    prisma.shop.findUnique({
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
        _count: { select: { reviews: true } },
      },
    }),
  ]);

  if (!shop || shop.status !== "ACTIVE") notFound();

  const isPremium = shop.subscription?.status === "ACTIVE" &&
    (shop.subscription?.planKey === "PREMIUM" || shop.subscription?.planKey === "PROMOTION");
  const boardImg = shop.images.find((i) => i.kind === "STOREFRONT_BOARD")?.url ?? null;
  const generalImgs = shop.images.filter((i) => i.kind !== "STOREFRONT_BOARD");

  const currentUserId = session ? getUserId(session) : null;
  const isOwner = currentUserId === shop.ownerUserId;
  const isAuthenticated = !!session;

  const [favourite, reviewAgg] = await Promise.all([
    currentUserId
      ? prisma.shopFavourite.findUnique({
          where: { shopId_userId: { shopId: shop.id, userId: currentUserId } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.shopReview.aggregate({
      where: { shopId: shop.id },
      _avg: { rating: true },
      _count: true,
    }),
  ]);

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

  // Fire-and-forget VIEW analytics for PREMIUM/PROMOTION shops
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
    }).catch(() => { /* non-fatal */ });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.xplosale.com";
  const shopUrl = `${base}/shops/${shop.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: shop.name,
    description: shop.description.slice(0, 300),
    url: shopUrl,
    ...(boardImg ? { image: boardImg } : {}),
    ...(shop.contactPhone ? { telephone: shop.contactPhone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: shop.addressLine,
      addressLocality: shop.region.city,
      addressCountry: "PK",
    },
    ...(shop.lat != null && shop.lng != null
      ? { geo: { "@type": "GeoCoordinates", latitude: shop.lat, longitude: shop.lng } }
      : {}),
    ...(shop.workingHours && typeof shop.workingHours === "object" && Object.keys(shop.workingHours).length > 0
      ? {
          openingHours: Object.entries(shop.workingHours as Record<string, string>)
            .filter(([, h]) => h && h !== "Closed")
            .map(([day, h]) => `${day.slice(0, 2)} ${h}`),
        }
      : {}),
    ...(reviewAgg._count > 0 && reviewAgg._avg.rating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(reviewAgg._avg.rating * 10) / 10,
            reviewCount: reviewAgg._count,
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Shops", item: `${base}/shops` },
      { "@type": "ListItem", position: 2, name: shop.category, item: `${base}/shops` },
      { "@type": "ListItem", position: 3, name: shop.name, item: shopUrl },
    ],
  };

  return (
    <main className="shop-page" style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(20px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} />
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
              {shop.subscription?.planKey === "PROMOTION" && (
                <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                  🔥 Top Placement
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
              {shop.category} · {shop.type} · {shop.region.name}, {shop.region.city}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
            <ShopContactActions
              shopId={shop.id}
              shopName={shop.name}
              contactPhone={shop.contactPhone}
              website={shop.website}
            />
            {!isOwner && (
              <MessageShopButton
                shopId={shop.id}
                ownerUserId={shop.ownerUserId}
                isAuthenticated={isAuthenticated}
              />
            )}
            {!isOwner && (
              <FavouriteButton
                shopId={shop.id}
                initialFavourited={!!favourite}
                isAuthenticated={isAuthenticated}
              />
            )}
            <ShareButton url={`/shops/${shop.slug}`} title={shop.name} text={`Check out ${shop.name} on Xplosale`} />
          </div>
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

        {/* Working hours */}
        {shop.workingHours && typeof shop.workingHours === "object" && Object.keys(shop.workingHours).length > 0 && (
          <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".04em" }}>Working Hours</p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px" }}>
              {Object.entries(shop.workingHours as Record<string, string>).map(([day, hours]) => (
                <>
                  <span key={`${day}-d`} style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", textTransform: "capitalize" }}>{day}</span>
                  <span key={`${day}-h`} style={{ fontSize: 13, color: "var(--ink-soft)" }}>{hours}</span>
                </>
              ))}
            </div>
          </div>
        )}

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

        {/* Payment info banner */}
        {hasPayment && (
          <div style={{
            background: "rgba(15,184,126,.05)", border: "1px solid rgba(15,184,126,.25)",
            borderRadius: 14, padding: "12px 16px", marginBottom: 20,
            display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--green)" }}>✓ Accepts orders</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {shop.acceptsCash && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(15,184,126,.1)", color: "var(--green)" }}>Cash</span>}
              {shop.bankAccountNumber && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(15,184,126,.1)", color: "var(--green)" }}>Bank Transfer</span>}
              {shop.jazzcashNumber && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(15,184,126,.1)", color: "var(--green)" }}>JazzCash</span>}
              {shop.easipaisaNumber && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(15,184,126,.1)", color: "var(--green)" }}>EasyPaisa</span>}
              {shop.acceptsDelivery && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(15,184,126,.1)", color: "var(--green)" }}>Delivery</span>}
            </div>
          </div>
        )}

        {/* Products */}
        {shop.products.length > 0 && (
          <div style={{ marginBottom: 32 }}>
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
                    className="card-hover"
                    style={{
                      background: "var(--white)", border: "1px solid var(--line)",
                      borderRadius: 12, overflow: "hidden",
                    }}
                  >
                    <Link href={`/shops/${shop.slug}/p/${product.id}`} style={{ textDecoration: "none", display: "block" }}>
                      <div style={{ height: 120, background: "var(--paper-2)", position: "relative" }}>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛍️</div>
                        )}
                        {!product.inStock && (
                          <div style={{
                            position: "absolute", inset: 0, background: "rgba(0,0,0,.4)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.6)", padding: "3px 10px", borderRadius: 99 }}>
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: "10px 12px 0" }}>
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
                    </Link>
                    <div style={{ padding: "0 12px 10px" }}>
                      {hasPayment && !isOwner && product.inStock && (
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
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews section */}
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", marginBottom: 20 }}>
          <ShopReviews shopId={shop.id} currentUserId={currentUserId} />
        </div>

        {/* Report + meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
            Listed on Xplosale Shops
          </p>
          {!isOwner && (
            <ReportShopButton shopId={shop.id} isAuthenticated={isAuthenticated} />
          )}
        </div>

      </div>

      {/* Mobile sticky action bar (visitors only) */}
      {!isOwner && (shop.contactPhone || shop.website) && (
        <div
          className="shop-sticky-bar"
          style={{
            display: "none",
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
            padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
            background: "var(--white)", borderTop: "1px solid var(--line)",
            boxShadow: "0 -4px 20px rgba(28,24,21,.08)",
            gap: 8,
          }}
        >
          <ShopContactActions
            shopId={shop.id}
            shopName={shop.name}
            contactPhone={shop.contactPhone}
            website={shop.website}
            compact
          />
        </div>
      )}

      <style>{`
        @media (max-width: 720px) {
          .shop-sticky-bar { display: flex !important; }
          .shop-page { padding-bottom: 90px !important; }
        }
      `}</style>
    </main>
  );
}
