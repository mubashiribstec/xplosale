"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/shop-categories";

interface Props {
  counts: Record<string, number>;
}

export default function CategoryGrid({ counts }: Props) {
  const featured = CATEGORIES.filter((c) => c.featured);
  const rest      = CATEGORIES.filter((c) => !c.featured && c.slug !== "other");
  const other     = CATEGORIES.find((c) => c.slug === "other")!;

  function Card({ cat, large = false }: { cat: (typeof CATEGORIES)[0]; large?: boolean }) {
    const count = counts[cat.label] ?? 0;
    return (
      <Link
        href={`/shops/category/${cat.slug}`}
        style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}
      >
        <div
          style={{
            background: `color-mix(in srgb, ${cat.accent} 8%, var(--white))`,
            border: `1.5px solid color-mix(in srgb, ${cat.accent} 20%, var(--line))`,
            borderRadius: large ? 18 : 14,
            padding: large ? "20px 18px" : "14px 14px",
            display: "flex",
            flexDirection: "column",
            gap: large ? 10 : 6,
            height: "100%",
            boxSizing: "border-box",
            transition: "box-shadow .15s, transform .15s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px color-mix(in srgb, ${cat.accent} 20%, transparent)`;
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "";
            (e.currentTarget as HTMLDivElement).style.transform = "";
          }}
        >
          <span style={{ fontSize: large ? 32 : 24, lineHeight: 1 }}>{cat.icon}</span>
          <div>
            <p style={{
              fontSize: large ? 14 : 13,
              fontWeight: 700,
              color: "var(--ink)",
              margin: 0,
              fontFamily: "var(--body)",
              lineHeight: 1.3,
            }}>
              {cat.label}
            </p>
            {large && (
              <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "3px 0 0", fontFamily: "var(--body)", lineHeight: 1.4 }}>
                {cat.description}
              </p>
            )}
          </div>
          <p style={{
            fontSize: 11,
            color: cat.accent,
            fontWeight: 600,
            margin: 0,
            fontFamily: "var(--body)",
            marginTop: "auto",
          }}>
            {count > 0 ? `${count} shop${count !== 1 ? "s" : ""}` : "Be the first"}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div style={{ fontFamily: "var(--body)" }}>
      {/* Featured row — larger cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
        marginBottom: 12,
      }}>
        {featured.map((cat) => (
          <Card key={cat.slug} cat={cat} large />
        ))}
      </div>

      {/* All other categories — compact grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 8,
      }}>
        {rest.map((cat) => (
          <Card key={cat.slug} cat={cat} />
        ))}
        <Card cat={other} />
      </div>
    </div>
  );
}
