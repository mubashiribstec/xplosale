import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My Orders — Xplosale",
  robots: { index: false, follow: false },
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#d97706",
  PAYMENT_SUBMITTED: "#7c3aed",
  CONFIRMED: "#2563eb",
  PREPARING: "#0284c7",
  READY: "#059669",
  COMPLETED: "#16a34a",
  CANCELLED: "#9ca3af",
};

const PM_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
};

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function MyOrdersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const customerId = getUserId(session);

  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));
  const PAGE_SIZE = 20;

  const [orders, total] = await Promise.all([
    prisma.shopOrder.findMany({
      where: { customerId },
      include: {
        items: { take: 3, select: { name: true, quantity: true } },
        shop: {
          select: {
            id: true, name: true, slug: true,
            images: { where: { kind: "STOREFRONT_BOARD" }, take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.shopOrder.count({ where: { customerId } }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(22px,4vw,30px)", color: "var(--ink)", margin: "0 0 6px" }}>
          My Orders
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 28px" }}>
          {total} order{total !== 1 ? "s" : ""} total
        </p>

        {orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🛍️</p>
            <p style={{ fontSize: 15, color: "var(--ink-soft)", margin: "0 0 16px" }}>No orders yet</p>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {orders.map((order) => {
              const shopImg = order.shop.images[0]?.url ?? null;
              const itemsPreview = order.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ");

              return (
                <div
                  key={order.id}
                  style={{
                    background: "var(--white)", border: "1px solid var(--line)",
                    borderRadius: 16, overflow: "hidden", display: "flex",
                  }}
                >
                  {/* Shop image */}
                  <div style={{ width: 80, flexShrink: 0, background: "var(--paper-2)" }}>
                    {shopImg ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shopImg} alt={order.shop.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏪</div>
                    )}
                  </div>

                  {/* Order details */}
                  <div style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <Link
                        href={`/shops/${order.shop.slug}`}
                        style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}
                      >
                        {order.shop.name}
                      </Link>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                        background: "rgba(0,0,0,.05)", color: STATUS_COLOR[order.status] ?? "var(--ink)",
                        letterSpacing: ".04em", flexShrink: 0,
                      }}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 4px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {itemsPreview}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--clay)" }}>
                        PKR {Number(order.totalAmount).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                        {PM_LABEL[order.paymentMethod] ?? order.paymentMethod}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                        {order.deliveryType === "DELIVERY" ? "🚚 Delivery" : "🏪 Pickup"}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--ink-faint)", marginLeft: "auto" }}>
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
            {page > 1 && (
              <Link
                href={`/me/orders?page=${page - 1}`}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13, color: "var(--ink)", textDecoration: "none" }}
              >
                ← Prev
              </Link>
            )}
            <span style={{ padding: "7px 14px", fontSize: 13, color: "var(--ink-faint)" }}>
              {page} / {pages}
            </span>
            {page < pages && (
              <Link
                href={`/me/orders?page=${page + 1}`}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13, color: "var(--ink)", textDecoration: "none" }}
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
