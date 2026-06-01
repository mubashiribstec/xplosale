/**
 * Edge-safe auth wrapper for middleware.
 * Providers (Credentials/Google/Nodemailer) import Node.js-only modules
 * (crypto, nodemailer) and cannot run in the Edge Runtime. Middleware only
 * needs to decode the existing JWT cookie — it doesn't need providers at all.
 * NextAuth derives the secret from NEXTAUTH_SECRET automatically.
 */
import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const edgeAuthConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
};

export const { auth } = NextAuth(edgeAuthConfig);
