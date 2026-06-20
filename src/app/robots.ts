import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://xplosale.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/m/", "/jobs/", "/shops/"],
        disallow: [
          "/shops/manage/",
          "/me/",
          "/admin/",
          "/chat/",
          "/api/",
          "/auth/",
          "/verify/",
          "/login/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
