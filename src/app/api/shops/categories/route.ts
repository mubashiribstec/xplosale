/**
 * GET /api/shops/categories
 * Returns all shop categories enriched with live ACTIVE shop counts.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/shop-categories";

export async function GET() {
  try {
    const grouped = await prisma.shop.groupBy({
      by: ["category"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    });

    const countMap: Record<string, number> = Object.fromEntries(
      grouped.map((g) => [g.category, g._count._all])
    );

    const categories = CATEGORIES.map((cat) => ({
      slug:        cat.slug,
      label:       cat.label,
      icon:        cat.icon,
      accent:      cat.accent,
      description: cat.description,
      featured:    cat.featured,
      count:       countMap[cat.label] ?? 0,
    }));

    return NextResponse.json({ categories }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ categories: [] }, { status: 500 });
  }
}
