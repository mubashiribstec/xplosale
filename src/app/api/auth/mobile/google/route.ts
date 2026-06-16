import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Mobile Google sign-in (native apps).
 *
 * The browser uses the NextAuth redirect flow; native apps can't. Instead the
 * app does a native Google Sign-In, gets a Google **ID token**, and POSTs it
 * here. We verify the token, upsert the user into the SAME Prisma/Supabase DB
 * the website uses (linking a google `Account` exactly like the PrismaAdapter),
 * and return a NextAuth-compatible session JWT. The app then sends that JWT as
 * the session cookie on `/api/*` calls, so it reuses the existing authenticated
 * API and data — same login, same database as the web.
 *
 * Required env:
 *   AUTH_SECRET (or NEXTAUTH_SECRET)  — signs the session JWT (must match the web)
 *   GOOGLE_MOBILE_CLIENT_IDS          — comma-separated allowed `aud` values
 *                                       (the Web/"server" OAuth client id used by
 *                                       Android Credential Manager / iOS). Falls
 *                                       back to GOOGLE_CLIENT_ID.
 */

export const runtime = "nodejs";

const BodySchema = z.object({ idToken: z.string().min(20) });

const SESSION_MAX_AGE_SECS =
  parseInt(process.env.SESSION_MAX_AGE_DAYS ?? "30", 10) * 24 * 60 * 60;

function allowedAudiences(): string[] {
  const list = (process.env.GOOGLE_MOBILE_CLIENT_IDS ?? process.env.GOOGLE_CLIENT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list;
}

function sessionCookieName(): string {
  const url = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.startsWith("https") ? "__Secure-authjs.session-token" : "authjs.session-token";
}

type GoogleTokenInfo = {
  aud: string;
  sub: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  exp?: string;
};

/** Verify a Google ID token via Google's tokeninfo endpoint (no extra deps). */
async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) return null;
  const info = (await res.json()) as GoogleTokenInfo;
  const audiences = allowedAudiences();
  if (audiences.length > 0 && !audiences.includes(info.aud)) return null;
  const verified = info.email_verified === true || info.email_verified === "true";
  if (!info.email || !verified || !info.sub) return null;
  return info;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const limit = await rateLimit(`mobile-google:ip:${ip}`, 20, 600);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server auth not configured" }, { status: 500 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }

  const info = await verifyGoogleIdToken(parsed.data.idToken);
  if (!info) {
    return NextResponse.json({ error: "Invalid Google token" }, { status: 401 });
  }

  const email = info.email!.toLowerCase();

  // Upsert user + link the google Account, mirroring @auth/prisma-adapter.
  const user = await prisma.$transaction(async (tx) => {
    const existingAccount = await tx.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: info.sub } },
      select: { user: true },
    });
    if (existingAccount) return existingAccount.user;

    let dbUser = await tx.user.findUnique({ where: { email } });
    if (!dbUser) {
      dbUser = await tx.user.create({
        data: {
          email,
          name: info.name ?? email.split("@")[0],
          image: info.picture ?? null,
          emailVerified: new Date(),
        },
      });
    }
    await tx.account.create({
      data: {
        userId: dbUser.id,
        type: "oidc",
        provider: "google",
        providerAccountId: info.sub,
      },
    });
    return dbUser;
  });

  if (user.bannedAt) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    secret,
    salt: sessionCookieName(),
    maxAge: SESSION_MAX_AGE_SECS,
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.image,
      role: user.role,
      phone: user.phone ?? null,
      bannedAt: null,
      tokenVersion: user.tokenVersion,
      roleRefreshedAt: now,
    },
  });

  return NextResponse.json({
    token,
    cookieName: sessionCookieName(),
    expiresAt: new Date((now + SESSION_MAX_AGE_SECS) * 1000).toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
    },
  });
}
