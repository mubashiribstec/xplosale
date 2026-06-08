import { auth } from "@/core/auth/auth.edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { edgeKvGet, edgeKvSetNx } from "@/core/adapters/kv.edge";

const BANNED_PAGE = "/banned";
const OPEN_PATHS = [BANNED_PAGE, "/login", "/"];

function isBannedSafe(pathname: string): boolean {
  return OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "?"));
}

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (session) {
    const userId = (session.user as { id?: string } | undefined)?.id;

    if (userId) {
      // Instant ban enforcement via Redis (O(1), ~0.5 ms).
      const redisBanned = await edgeKvGet(`banned:${userId}`);
      if (redisBanned === "1") {
        if (!isBannedSafe(pathname)) {
          return NextResponse.redirect(new URL(BANNED_PAGE, req.nextUrl));
        }
      }

      // Throttled lastSeen tracking — at most one write per 55 s per user.
      edgeKvSetNx(`lastSeen:${userId}`, String(Date.now()), 55).catch(() => null);
    }

    // JWT-based ban fallback (delayed up to 5 min until token refresh)
    const bannedAt = (session.user as { bannedAt?: string | null })?.bannedAt;
    if (bannedAt) {
      if (!isBannedSafe(pathname)) {
        return NextResponse.redirect(new URL(BANNED_PAGE, req.nextUrl));
      }
    }
  }

  // Admin routes — /admin/login is public; everything else requires a session
  // (role enforcement is handled by the admin layout with a live DB check)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
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

  // Forward the current pathname so server layouts can read it via headers()
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/me/:path*",
    "/employer/:path*",
    "/chat/:path*",
    "/partner/:path*",
    // also run for authenticated sessions on all pages for ban enforcement
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
