import Link from "next/link";
import { CATEGORIES } from "@/lib/shop-categories";

interface Props {
  counts: Record<string, number>;
  activeSlug?: string;
}

export default function CategorySidebar({ counts, activeSlug }: Props) {
  return (
    <aside
      style={{
        width: 230,
        flexShrink: 0,
        fontFamily: "var(--body)",
        position: "sticky",
        top: 16,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 10,
      }}
    >
      <p style={{
        fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
        color: "var(--ink-faint)", margin: "4px 8px 8px",
      }}>
        Categories
      </p>

      <Link
        href="/shops"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          padding: "8px 10px", borderRadius: 10, textDecoration: "none",
          marginBottom: 2,
          background: !activeSlug ? "var(--paper-2)" : "transparent",
          color: !activeSlug ? "var(--ink)" : "var(--ink-soft)",
          fontWeight: !activeSlug ? 700 : 500,
          fontSize: 13,
        }}
      >
        <span>🏬 All Shops</span>
      </Link>

      {CATEGORIES.map((cat) => {
        const isActive = cat.slug === activeSlug;
        const count = counts[cat.label] ?? 0;
        return (
          <Link
            key={cat.slug}
            href={`/shops/category/${cat.slug}`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              padding: "7px 10px", borderRadius: 10, textDecoration: "none",
              marginBottom: 2,
              background: isActive ? `color-mix(in srgb, ${cat.accent} 10%, var(--white))` : "transparent",
              color: isActive ? cat.accent : "var(--ink-soft)",
              fontWeight: isActive ? 700 : 500,
              fontSize: 13,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{cat.icon}</span>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.label}</span>
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-faint)", flexShrink: 0 }}>{count}</span>
          </Link>
        );
      })}
    </aside>
  );
}
