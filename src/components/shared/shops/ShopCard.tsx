import Link from "next/link";
import { getCategoryIcon } from "@/lib/shop-categories";

interface ShopCardProps {
  shop: {
    name: string;
    slug: string;
    category: string;
    verifiedShop: boolean;
    featured: boolean;
    region: { name: string; city: string; country: string };
    images: { url: string }[];
    subscription: { planKey: string; status: string } | null;
    _count: { products: number };
    averageRating?: number | null;
    reviewCount?: number;
  };
}

export default function ShopCard({ shop }: ShopCardProps) {
  const boardImg = shop.images[0]?.url;
  const categoryIcon = getCategoryIcon(shop.category);
  const isPremiumActive =
    shop.subscription?.status === "ACTIVE" &&
    (shop.subscription?.planKey === "PREMIUM" || shop.subscription?.planKey === "PROMOTION");
  const isPromotion = shop.subscription?.status === "ACTIVE" && shop.subscription?.planKey === "PROMOTION";

  return (
    <Link
      href={`/shops/${shop.slug}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div style={{
        background: "var(--white)",
        border: `1px solid ${isPromotion ? "rgba(124,58,237,.3)" : "var(--line)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "box-shadow .15s",
        fontFamily: "var(--body)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Photo */}
        <div style={{ position: "relative", height: 148, background: "var(--paper-2)", flexShrink: 0 }}>
          {boardImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={boardImg}
              alt={shop.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 36,
            }}>
              🏪
            </div>
          )}
          {/* Promotion badge */}
          {isPromotion && (
            <span style={{
              position: "absolute", top: 8, left: 8,
              background: "#7c3aed", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "2px 7px",
              borderRadius: 6, letterSpacing: ".04em",
            }}>
              🔥 Top
            </span>
          )}
          {/* Featured badge */}
          {shop.featured && isPremiumActive && !isPromotion && (
            <span style={{
              position: "absolute", top: 8, left: 8,
              background: "#d97706", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "2px 7px",
              borderRadius: 6, letterSpacing: ".04em", textTransform: "uppercase",
            }}>
              Featured
            </span>
          )}
          {/* Verified badge */}
          {shop.verifiedShop && (
            <span style={{
              position: "absolute", top: 8, right: 8,
              background: "rgba(15,184,126,.9)", color: "#fff",
              fontSize: 10, fontWeight: 700, padding: "2px 7px",
              borderRadius: 6, letterSpacing: ".04em",
            }}>
              ✓ Verified
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
          <p style={{
            fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: 0,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {shop.name}
          </p>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "var(--clay)",
            background: "rgba(160,78,55,.08)", padding: "2px 8px",
            borderRadius: 6, alignSelf: "flex-start",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 13 }}>{categoryIcon}</span>
            {shop.category}
          </span>
          {/* Rating */}
          {shop.averageRating != null && shop.averageRating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#f59e0b", fontSize: 13 }}>
                {"★".repeat(Math.round(shop.averageRating))}{"☆".repeat(5 - Math.round(shop.averageRating))}
              </span>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {shop.averageRating.toFixed(1)}{shop.reviewCount ? ` (${shop.reviewCount})` : ""}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
              {shop.region.name}, {shop.region.city}
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
              {shop._count.products} product{shop._count.products !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
