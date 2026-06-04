import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Map legacy EMPLOYER* roles to PARTNER so old JWT tokens upgrade transparently.
const LEGACY_EMPLOYER_ROLES = new Set([
  "EMPLOYER",
  "EMPLOYER_RECRUITER",
  "EMPLOYER_HIRING_MANAGER",
  "EMPLOYER_INTERVIEWER",
]);

function normalizeRole(role: string): string {
  return LEGACY_EMPLOYER_ROLES.has(role) ? "PARTNER" : role;
}

const providers: NextAuthConfig["providers"] = [];

// Only activate Google provider when credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

const SESSION_MAX_AGE_SECS =
  parseInt(process.env.SESSION_MAX_AGE_DAYS ?? "30") * 24 * 60 * 60;

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECS },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  logger: {
    error(err) {
      console.error("[NextAuth] Error:", err instanceof Error ? err.message : String(err));
    },
    warn(code) {
      console.warn("[NextAuth] Warning:", code);
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && user.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { name: user.name ?? user.email?.split("@")[0] ?? "User" },
          });
        } catch {
          // User may not exist yet — adapter creates it first; ignore
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = normalizeRole((user as { role?: string }).role ?? "USER");
        token.phone = (user as { phone?: string }).phone ?? null;
      }

      // On sign-in: hydrate token from DB. Role is database-driven only.
      // Admin promotion is done via POST /api/admin/bootstrap (first-admin flow)
      // or directly in the database — never through an environment variable.
      if (account && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true, phone: true, bannedAt: true, tokenVersion: true },
        });
        if (dbUser) {
          token.role = normalizeRole(dbUser.role);
          token.id = dbUser.id;
          token.phone = dbUser.phone ?? null;
          token.bannedAt = dbUser.bannedAt?.toISOString() ?? null;
          token.tokenVersion = dbUser.tokenVersion;
          token.roleRefreshedAt = Math.floor(Date.now() / 1000);
        }
      }

      // Force immediate role refresh when the client calls session.update()
      // (used after admin bootstrap so the new ADMIN role is visible right away)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        if (dbUser) {
          token.role = normalizeRole(dbUser.role);
          token.roleRefreshedAt = Math.floor(Date.now() / 1000);
        }
      }

      // Re-fetch role/ban status every 5 minutes so changes take effect promptly
      if (!user && token.id && trigger !== "update") {
        const now = Math.floor(Date.now() / 1000);
        const lastRefresh = (token.roleRefreshedAt as number | undefined) ?? 0;
        if (now - lastRefresh > 300) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, bannedAt: true, tokenVersion: true },
          });
          if (dbUser) {
            // Token version mismatch → force sign-out (admin rotated the token)
            if (token.tokenVersion !== undefined && dbUser.tokenVersion !== token.tokenVersion) {
              return null as unknown as typeof token;
            }
            token.role = normalizeRole(dbUser.role);
            token.bannedAt = dbUser.bannedAt?.toISOString() ?? null;
            token.roleRefreshedAt = now;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as unknown as {
          id: string;
          phone: string | null;
          role: string;
          bannedAt: string | null;
        };
        u.id = token.id as string;
        u.phone = (token.phone as string | null) ?? null;
        u.role = token.role as string;
        u.bannedAt = (token.bannedAt as string | null) ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
