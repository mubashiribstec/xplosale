import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, getUserId } from "@/core/auth/session";
import { getEffectivePlan } from "@/verticals/shops/tier";

export const metadata: Metadata = {
  title: "Shop Analytics — Xplosale",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const DAYS = 30;

export default async function ShopAnalyticsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?callbackUrl=/shops/manage/${id}/analytics`);
  const userId = getUserId(session);
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  const shop = await prisma.shop.findUnique({
    where: { id },
    select: { id: true, name: true, ownerUserId: true, status: true },
  });
  if (!shop) notFound();
  if (shop.ownerUserId !== userId && !isAdmin) notFound();

  const plan = await getEffectivePlan(id);

  if (!plan.analytics) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <Link href={`/shops/manage/${id}`} style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}>
            ← {shop.name}
          </Link>

          <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, overflow: "hidden", textAlign: "center" }}>
            {/* Blurred fake chart */}
            <div aria-hidden style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "24px 32px 0", filter: "blur(5px)", opacity: 0.5 }}>
              {[35, 55, 40, 70, 60, 90, 75, 50, 80, 65, 95, 70, 45, 85].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, background: "var(--clay)", borderRadius: "4px 4px 0 0" }} />
              ))}
            </div>
            <div style={{ padding: "28px 32px 36px" }}>
              <p style={{ fontSize: 36, margin: "0 0 10px" }}>🔒</p>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 24, color: "var(--ink)", margin: "0 0 8px" }}>
                Analytics is a Premium feature
              </h1>
              <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 22px", lineHeight: 1.6, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
                See how many people view your shop every day, which products they tap, and how often they call or visit your website — so you know what&rsquo;s working.
              </p>
              <Link
                href={`/shops/manage/${id}/upgrade`}
                style={{
                  display: "inline-block", padding: "12px 28px", background: "var(--clay)", color: "var(--white)",
                  borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none",
                }}
              >
                Upgrade to Premium →
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const events = await prisma.shopAnalyticsEvent.findMany({
    where: { shopId: id, day: { gte: since } },
    select: { kind: true, productId: true, day: true, count: true },
  });

  // Aggregate
  const totals = { VIEW: 0, PRODUCT_CLICK: 0, CONTACT_CLICK: 0, WEBSITE_CLICK: 0 };
  const viewsByDay = new Map<string, number>();
  const productClicks = new Map<string, number>();

  for (const e of events) {
    totals[e.kind] += e.count;
    if (e.kind === "VIEW") {
      const key = e.day.toISOString().slice(0, 10);
      viewsByDay.set(key, (viewsByDay.get(key) ?? 0) + e.count);
    }
    if (e.kind === "PRODUCT_CLICK" && e.productId) {
      productClicks.set(e.productId, (productClicks.get(e.productId) ?? 0) + e.count);
    }
  }

  // Build the 30-day series
  const series: { date: string; label: string; count: number }[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    series.push({
      date: key,
      label: d.toLocaleDateString("en-PK", { day: "numeric", month: "short" }),
      count: viewsByDay.get(key) ?? 0,
    });
  }
  const maxViews = Math.max(1, ...series.map((s) => s.count));

  // Top products
  const topIds = [...productClicks.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topProducts = topIds.length > 0
    ? await prisma.shopProduct.findMany({
        where: { id: { in: topIds.map(([pid]) => pid) } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(topProducts.map((p) => [p.id, p.name]));

  const statCards = [
    { label: "Shop views", value: totals.VIEW, icon: "👁", color: "var(--blue)" },
    { label: "Product clicks", value: totals.PRODUCT_CLICK, icon: "🛍", color: "var(--green)" },
    { label: "Contact taps", value: totals.CONTACT_CLICK, icon: "📞", color: "var(--clay)" },
    { label: "Website clicks", value: totals.WEBSITE_CLICK, icon: "🌐", color: "var(--purple)" },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)", fontFamily: "var(--body)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Link href={`/shops/manage/${id}`} style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}>
          ← {shop.name}
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(24px,4vw,32px)", color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.1 }}>
          Analytics
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: "0 0 28px" }}>
          Last {DAYS} days · counts are daily totals, no personal visitor data is stored
        </p>

        {/* Stat cards */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {statCards.map((s) => (
            <div key={s.label} style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px" }}>
              <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "0 0 6px", fontWeight: 600 }}>
                {s.icon} {s.label}
              </p>
              <p className="mono" style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>
                {s.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Views bar chart */}
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px", marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 16px", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Daily shop views
          </p>
          {totals.VIEW === 0 ? (
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0, padding: "24px 0", textAlign: "center" }}>
              No views recorded yet. Share your shop link to get visitors!
            </p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160 }}>
                {series.map((s) => (
                  <div
                    key={s.date}
                    title={`${s.label}: ${s.count} view${s.count !== 1 ? "s" : ""}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(2, (s.count / maxViews) * 100)}%`,
                      background: s.count > 0 ? "var(--clay)" : "var(--paper-3)",
                      borderRadius: "3px 3px 0 0",
                      transformOrigin: "bottom",
                      animation: "growBar .6s cubic-bezier(.16,1,.3,1)",
                      minWidth: 0,
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{series[0].label}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{series[series.length - 1].label}</span>
              </div>
            </>
          )}
        </div>

        {/* Top products */}
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 16, padding: "20px 22px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: ".05em" }}>
            Most clicked products
          </p>
          {topIds.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
              No product clicks yet. Product clicks are counted when visitors open a product page.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topIds.map(([pid, count], i) => {
                const max = topIds[0][1];
                return (
                  <div key={pid} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)", width: 18, flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600, width: "32%", minWidth: 110, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {nameById.get(pid) ?? "Deleted product"}
                    </span>
                    <div style={{ flex: 1, height: 10, background: "var(--paper-2)", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: "var(--green)", borderRadius: 99 }} />
                    </div>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", width: 40, textAlign: "right", flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
