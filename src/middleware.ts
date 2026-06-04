import { auth } from "@/core/auth/auth.edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { edgeKvGet, edgeKvSetNx } from "@/core/adapters/kv.edge";

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (session) {
    const userId = (session.user as { id?: string } | undefined)?.id;

    if (userId) {
      // Instant ban enforcement via Redis (O(1), ~0.5 ms).
      // Falls back to JWT bannedAt check if REST env vars are not configured.
      const redisBanned = await edgeKvGet(`banned:${userId}`);
      if (redisBanned === "1") {
        if (!pathname.startsWith("/login") && pathname !== "/") {
          return NextResponse.redirect(new URL("/login?reason=banned", req.nextUrl));
        }
      }

      // Throttled lastSeen tracking — at most one write per 55 s per user.
      // Uses SET NX so only the first request in the window writes to Redis.
      edgeKvSetNx(`lastSeen:${userId}`, String(Date.now()), 55).catch(() => null);
    }

    // JWT-based ban fallback (delayed up to 5 min until token refresh)
    const bannedAt = (session.user as { bannedAt?: string | null })?.bannedAt;
    if (bannedAt) {
      if (!pathname.startsWith("/login") && pathname !== "/") {
        return NextResponse.redirect(new URL("/login?reason=banned", req.nextUrl));
      }
    }
  }

  // Admin routes — require ADMIN role
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    const role = (session.user as { role?: string } | undefined)?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }

  // Account / me / partner routes — require authentication
  if (
    pathname.startsWith("/me") ||
    pathname.startsWith("/employer") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/partner")
  ) {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    // /partner requires PARTNER or ADMIN role
    if (pathname.startsWith("/partner") && pathname !== "/partner/register") {
      const role = (session.user as { role?: string } | undefined)?.role;
      if (role !== "PARTNER" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/partner/register", req.nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/me/:path*", "/employer/:path*", "/chat/:path*", "/partner/:path*"],
};
