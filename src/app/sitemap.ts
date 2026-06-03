import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // regenerate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://xplosale.com";

  const [listings, jobs, profiles] = await Promise.all([
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
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/m`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/jobs`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/n`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  ];

  return [
    ...staticRoutes,
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
    ...profiles.map((p) => ({
      url: `${base}/n/${p.handle}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
