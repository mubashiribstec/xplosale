"use client";

interface ShopSetupChecklistProps {
  status: string;
  hasStorefront: boolean;
  productCount: number;
  hasPayment: boolean;
  hasWorkingHours: boolean;
}

interface ChecklistItem {
  label: string;
  done: boolean;
  href?: string;
  bonus?: boolean;
}

export default function ShopSetupChecklist({ status, hasStorefront, productCount, hasPayment, hasWorkingHours }: ShopSetupChecklistProps) {
  if (status !== "DRAFT" && status !== "REJECTED") return null;

  const items: ChecklistItem[] = [
    { label: "Shop details added", done: true },
    { label: "Storefront photo uploaded", done: hasStorefront, href: "#storefront" },
    { label: productCount > 0 ? `${productCount} product${productCount !== 1 ? "s" : ""} added` : "Add at least 1 product", done: productCount > 0, href: "#products" },
    { label: "Payment method set", done: hasPayment, href: "#payments" },
    { label: "Working hours (optional)", done: hasWorkingHours, href: "#details", bonus: true },
  ];

  const required = items.filter((i) => !i.bonus);
  const doneCount = required.filter((i) => i.done).length;
  const pct = Math.round((doneCount / required.length) * 100);
  const allDone = doneCount === required.length;

  return (
    <div style={{
      background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20,
      padding: "clamp(20px,4vw,28px)", marginBottom: 16, fontFamily: "var(--body)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <p style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: 0 }}>
          {allDone ? "🎉 Your shop is ready to submit!" : "Finish setting up your shop"}
        </p>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: allDone ? "var(--green)" : "var(--clay)" }}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 8, borderRadius: 99, background: "var(--paper-2)", overflow: "hidden", marginBottom: 18 }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${pct}%`,
          background: allDone ? "var(--green)" : "var(--clay)",
          transition: "width .5s cubic-bezier(.16,1,.3,1), background .3s",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const inner = (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                background: item.done ? "var(--green)" : "var(--paper-2)",
                color: item.done ? "var(--white)" : "var(--ink-faint)",
                border: item.done ? "none" : "1.5px solid var(--line)",
              }}>
                {item.done ? "✓" : ""}
              </span>
              <span style={{
                fontSize: 14,
                color: item.done ? "var(--ink-faint)" : "var(--ink-soft)",
                textDecoration: item.done ? "line-through" : "none",
                fontWeight: item.done ? 400 : 600,
              }}>
                {item.label}
              </span>
              {!item.done && item.href && (
                <span style={{ fontSize: 12, color: "var(--clay)", fontWeight: 600, marginLeft: "auto" }}>Do it →</span>
              )}
            </span>
          );
          return item.href && !item.done ? (
            <a key={item.label} href={item.href} style={{ textDecoration: "none" }}>{inner}</a>
          ) : (
            <div key={item.label}>{inner}</div>
          );
        })}
      </div>

      <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: "16px 0 0", lineHeight: 1.5 }}>
        {allDone
          ? "Hit Submit for Review below — we activate shops within 24 hours."
          : "When everything's checked, hit Submit for Review at the bottom of this page. We activate shops within 24 hours."}
      </p>
    </div>
  );
}
