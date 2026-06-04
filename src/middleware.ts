import { auth } from "@/core/auth/auth.edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Banned users can only visit /login and /
  if (session && (session.user as { bannedAt?: string | null })?.bannedAt) {
    if (!pathname.startsWith("/login") && pathname !== "/") {
      return NextResponse.redirect(new URL("/login?reason=banned", req.nextUrl));
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
