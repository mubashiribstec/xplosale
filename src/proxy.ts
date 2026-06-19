import { auth } from "@/core/auth/auth.edge";
import { NextResponse } from "next/server";
import { edgeKvGet, edgeKvSetNx, edgeKvIncr } from "@/core/adapters/kv.edge";

const BANNED_PAGE = "/banned";
const OPEN_PATHS = [BANNED_PAGE, "/login", "/"];

function isBannedSafe(pathname: string): boolean {
  return OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "?"));
}

/* ─── DoS / abuse guard (runs first, before any session work) ───────────────
   Two cheap, fail-open protections applied to /api/* requests:
   1. A request-body size ceiling so nobody can POST a multi-MB payload to hang
      the server (Next's default is the only other limit).
   2. A per-IP rate-limit backstop on writes, layered on top of the existing
      per-route limiters in src/lib/rate-limit.ts. */

// JSON APIs never legitimately exceed a few hundred KB; uploads are larger.
const JSON_BODY_LIMIT = 256 * 1024; // 256 KB
const UPLOAD_BODY_LIMIT = 12 * 1024 * 1024; // 12 MB (10 MB image + overhead)
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Global per-IP write backstop. Generous — real per-route limits are stricter.
const IP_WRITE_LIMIT = 120; // per minute

function isUploadPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/upload") ||
    (pathname.startsWith("/api/chat/rooms") && pathname.endsWith("/attachment")) ||
    (pathname.startsWith("/api/shops") && pathname.includes("/images")) ||
    (pathname.startsWith("/api/shops") && pathname.includes("/products") && pathname.endsWith("/images"))
  );
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function jsonError(message: string, status: number, extraHeaders?: Record<string, string>): NextResponse {
  return new NextResponse(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export default auth(async function middleware(req) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── API DoS guard ────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (WRITE_METHODS.has(req.method)) {
      // 1. Body-size ceiling (header-only check, no I/O).
      const len = Number(req.headers.get("content-length") ?? "");
      if (Number.isFinite(len) && len > 0) {
        const limit = isUploadPath(pathname) ? UPLOAD_BODY_LIMIT : JSON_BODY_LIMIT;
        if (len > limit) {
          return jsonError("Request body too large.", 413);
        }
      }

      // 2. Per-IP write backstop (fail-open if KV unavailable).
      const ip = clientIp(req);
      if (ip !== "unknown") {
        const bucket = Math.floor(Date.now() / 60_000);
        const count = await edgeKvIncr(`rlw:${ip}:${bucket}`, 60);
        if (count !== null && count > IP_WRITE_LIMIT) {
          return jsonError("Too many requests. Please slow down.", 429, { "Retry-After": "60" });
        }
      }
    }
  }

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
