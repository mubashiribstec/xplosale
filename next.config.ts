import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Type-checking runs separately (tsc --noEmit in CI). Skipping in-build TS
  // pass avoids the memory-heavy duplicate check on small (512MB) hosts.
  typescript: { ignoreBuildErrors: true },
  // Prisma's @prisma/adapter-pg pulls in @prisma/driver-adapter-utils and pg,
  // both of which have native bindings — keep them external to the server
  // bundle and resolve from node_modules at runtime.
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/driver-adapter-utils"],
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
  // Serve local uploads as static files (STORAGE_MODE=local only)
  async rewrites() {
    return [
      {
        source: "/uploads/public/:path*",
        destination: "/api/upload/serve-public/:path*",
      },
    ];
  },
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
