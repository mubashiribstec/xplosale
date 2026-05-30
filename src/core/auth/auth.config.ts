import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyOtp } from "./otp";
import { z } from "zod";

const credentialsSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
});

export const authConfig: NextAuthConfig = {
  providers: [
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

        // Upsert user on first login
        const user = await prisma.user.upsert({
          where: { phone },
          update: { isPhoneVerified: true },
          create: {
            phone,
            name: phone, // user can update name later in /me
            isPhoneVerified: true,
          },
        });

        return { id: user.id, phone: user.phone, name: user.name, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as { phone: string }).phone;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const u = session.user as unknown as { id: string; phone: string; role: string };
        u.id = token.id as string;
        u.phone = token.phone as string;
        u.role = token.role as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
