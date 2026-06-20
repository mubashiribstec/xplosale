import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getEffectivePlanForUser } from "@/verticals/shops/tier";
import UpgradePrompt from "@/components/shared/shops/UpgradePrompt";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "var(--ink-faint)" },
  PENDING_REVIEW: { label: "Pending Review", color: "#d97706" },
  ACTIVE: { label: "Active", color: "var(--green)" },
  REJECTED: { label: "Rejected", color: "var(--clay)" },
  SUSPENDED: { label: "Suspended", color: "var(--clay)" },
};

export default async function ShopsManagePage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/shops/manage");
  const userId = getUserId(session);

  const [shops, plan, dbUser] = await Promise.all([
    prisma.shop.findMany({
      where: { ownerUserId: userId },
      include: {
        region: { select: { name: true, city: true } },
        images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
        subscription: { select: { planKey: true, status: true } },
        _count: { select: { products: { where: { isHidden: false } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getEffectivePlanForUser(userId),
    prisma.user.findUnique({ where: { id: userId }, select: { hasShopkeeperBadge: true } }),
  ]);

  // Pending-order counts per shop (orders that need the shopkeeper's attention).
  const pendingGroups = shops.length
    ? await prisma.shopOrder.groupBy({
        by: ["shopId"],
        where: { shopId: { in: shops.map((s) => s.id) }, status: { in: ["PENDING", "PAYMENT_SUBMITTED"] } },
        _count: { _all: true },
      })
    : [];
  const pendingByShop = new Map(pendingGroups.map((g) => [g.shopId, g._count._all]));

  const activeShopCount = shops.filter((s) => !["REJECTED", "SUSPENDED"].includes(s.status)).length;
  const atLimit = activeShopCount >= plan.maxShops;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 6px" }}>
              Shops
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(26px,4vw,38px)", color: "var(--ink)", margin: 0, lineHeight: 1.1 }}>
                My Shops
              </h1>
              {dbUser?.hasShopkeeperBadge && <VerifiedBadge variant="shopkeeper" size="md" />}
            </div>
          </div>
          {!atLimit ? (
            <Link
              href="/shops/manage/new"
              style={{
                padding: "10px 20px",
                background: "var(--clay)",
                color: "var(--white)",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                fontFamily: "var(--body)",
              }}
            >
              + New Shop
            </Link>
          ) : (
            <span style={{ fontSize: 13, color: "var(--ink-faint)", fontFamily: "var(--body)" }}>
              {plan.maxShops} shop limit reached
            </span>
          )}
        </div>

        {atLimit && plan.key === "FREE" && (
          <div style={{ marginBottom: 28 }}>
            <UpgradePrompt
              message="You've reached the free plan limit of 1 shop. Upgrade to Premium to create up to 5 shops."
            />
          </div>
        )}

        {shops.length === 0 ? (
          <div
            style={{
              background: "var(--white)",
              border: "1.5px dashed var(--line)",
              borderRadius: 18,
              padding: "56px 32px",
              textAlign: "center",
              fontFamily: "var(--body)",
            }}
          >
            <p style={{ fontSize: 16, color: "var(--ink-soft)", marginBottom: 8 }}>You have no shops yet.</p>
            <p style={{ fontSize: 14, color: "var(--ink-faint)", marginBottom: 24 }}>
              Create your first shop listing to appear in the Xplosale Shops directory.
            </p>
            <Link
              href="/shops/manage/new"
              style={{
                padding: "11px 24px",
                background: "var(--clay)",
                color: "var(--white)",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Create your first shop
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {shops.map((shop) => {
              const statusInfo = STATUS_LABELS[shop.status] ?? STATUS_LABELS.DRAFT;
              const boardImg = shop.images[0]?.url;

              return (
                <div
                  key={shop.id}
                  style={{
                    background: "var(--white)",
                    border: "1px solid var(--line)",
                    borderRadius: 16,
                    padding: "18px 20px",
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    fontFamily: "var(--body)",
                  }}
                >
                  {/* Storefront thumbnail */}
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: "var(--paper-2)",
                      flexShrink: 0,
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--ink-faint)",
                      fontSize: 24,
                    }}
                  >
                    {boardImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={boardImg} alt={shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      "🏪"
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <h2 style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: 0 }}>{shop.name}</h2>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "var(--paper-2)",
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </span>
                      {shop.verifiedShop && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(15,184,126,.12)", color: "var(--green-deep)" }}>
                          Verified Shop
                        </span>
                      )}
                      {(pendingByShop.get(shop.id) ?? 0) > 0 && (
                        <Link
                          href={`/shops/manage/${shop.id}/orders`}
                          style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(160,78,55,.12)", color: "var(--clay)", textDecoration: "none" }}
                        >
                          📦 {pendingByShop.get(shop.id)} pending
                        </Link>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
                      {shop.category} · {shop.region.name}, {shop.region.city} · {shop._count.products} product{shop._count.products !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                    {(shop.status === "DRAFT" || shop.status === "REJECTED") && (
                      <Link
                        href={`/shops/manage/${shop.id}`}
                        style={{
                          padding: "7px 14px",
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--ink-soft)",
                          textDecoration: "none",
                        }}
                      >
                        Edit
                      </Link>
                    )}
                    {shop.status === "ACTIVE" && (
                      <Link
                        href={`/shops/${shop.slug}`}
                        style={{
                          padding: "7px 14px",
                          border: "1px solid var(--line)",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--ink-soft)",
                          textDecoration: "none",
                        }}
                      >
                        View
                      </Link>
                    )}
                    {shop.status === "DRAFT" && (
                      <SubmitButton shopId={shop.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Invite shopkeepers */}
        <div style={{
          marginTop: 28,
          background: "linear-gradient(135deg, var(--paper-2), var(--paper-3))",
          border: "1px solid var(--line)",
          borderRadius: 16,
          padding: "18px 22px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
          fontFamily: "var(--body)",
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: "0 0 4px" }}>
              🤝 Know a shopkeeper?
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
              Help your local market get online — invite them to list their shop free.
            </p>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`List your shop free on Xplosale and get orders online — ${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.xplosale.com"}/shops/manage/new`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 20px", background: "#25D366", color: "#fff",
              borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            💬 Invite on WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}

// Inline client component for submit action
function SubmitButton({ shopId }: { shopId: string }) {
  return (
    <Link
      href={`/shops/manage/${shopId}`}
      style={{
        padding: "7px 14px",
        background: "var(--clay)",
        color: "var(--white)",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        textDecoration: "none",
      }}
    >
      Edit & Submit
    </Link>
  );
}
