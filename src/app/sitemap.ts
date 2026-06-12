import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/shop-categories";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://xplosale.com";

  const [listings, jobs, profiles, shops, products] = await Promise.all([
    prisma.listing.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.jobPosting.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    }),
    prisma.networkProfile.findMany({
      where: { visibility: "PUBLIC" },
      select: { handle: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    }),
    prisma.shop.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    prisma.shopProduct.findMany({
      where: { isHidden: false, shop: { status: "ACTIVE" } },
      select: { id: true, updatedAt: true, shop: { select: { slug: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/m`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/jobs`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/shops`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/n`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/guide`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...CATEGORIES.map((c) => ({
      url: `${base}/shops/category/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...listings.map((l) => ({
      url: `${base}/m/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...jobs.map((j) => ({
      url: `${base}/jobs/${j.id}`,
      lastModified: j.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...shops.map((s) => ({
      url: `${base}/shops/${s.slug}`,
      lastModified: s.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/shops/${p.shop.slug}/p/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...profiles.map((p) => ({
      url: `${base}/n/${p.handle}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
