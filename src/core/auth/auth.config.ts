import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "./otp";
import { z } from "zod";

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

const credentialsSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
});

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Phone OTP",
    credentials: {
      phone: { label: "Phone", type: "text" },
      otp: { label: "OTP", type: "text" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { phone, otp } = parsed.data;
      const result = await verifyOtp(phone, otp);
      if (!result.ok) return null;

      const user = await prisma.user.upsert({
        where: { phone },
        update: { isPhoneVerified: true },
        create: {
          phone,
          name: phone,
          isPhoneVerified: true,
        },
      });

      return { id: user.id, phone: user.phone ?? "", name: user.name ?? "", role: user.role };
    },
  }),
];

// Only activate Google provider when credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Only activate email provider when server is configured
if (process.env.EMAIL_SERVER) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM ?? "noreply@xplosale.com",
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
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && account.provider !== "credentials" && user.id) {
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

      // On OAuth sign-in, fetch the freshly-created DB user and optionally
      // auto-promote the configured ADMIN_EMAIL when no admin exists yet.
      if (account && account.provider !== "credentials" && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, role: true, phone: true, email: true },
        });
        if (dbUser) {
          const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
          if (
            adminEmail &&
            dbUser.email?.toLowerCase() === adminEmail &&
            dbUser.role !== "ADMIN"
          ) {
            const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
            if (!existingAdmin) {
              await prisma.user.update({ where: { id: dbUser.id }, data: { role: "ADMIN" } });
              token.role = "ADMIN";
            } else {
              token.role = dbUser.role;
            }
          } else {
            token.role = normalizeRole(dbUser.role);
          }
          token.id = dbUser.id;
          token.phone = dbUser.phone ?? null;
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

      // Re-fetch role every 5 minutes so admin demotions take effect promptly
      if (!user && token.id && trigger !== "update") {
        const now = Math.floor(Date.now() / 1000);
        const lastRefresh = (token.roleRefreshedAt as number | undefined) ?? 0;
        if (now - lastRefresh > 300) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true },
          });
          if (dbUser) {
            token.role = normalizeRole(dbUser.role);
            token.roleRefreshedAt = now;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as unknown as { id: string; phone: string | null; role: string };
        u.id = token.id as string;
        u.phone = (token.phone as string | null) ?? null;
        u.role = token.role as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
