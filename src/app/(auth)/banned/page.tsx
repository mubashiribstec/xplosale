import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import BannedSupportChat from "@/components/shared/BannedSupportChat";

export const metadata: Metadata = {
  title: "Account Suspended | Xplosale",
  robots: { index: false, follow: false },
};

export default async function BannedPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true, banReason: true, bannedUntil: true },
  });

  // No longer banned — send them back to the site.
  if (!dbUser?.bannedAt) redirect("/");

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "24px 16px",
        fontFamily: "var(--body)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(28px, 5vw, 40px)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 8 }}>🚫</div>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 24,
              color: "var(--ink)",
              margin: "0 0 8px",
            }}
          >
            Account Suspended
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
            {dbUser.banReason ?? "Your account has been suspended due to a violation of our Terms of Service."}
            {dbUser.bannedUntil
              ? ` This suspension is temporary and lifts automatically.`
              : ` Chat with our support team below to appeal this decision.`}
          </p>
        </div>

        <BannedSupportChat />
      </div>
    </main>
  );
}
