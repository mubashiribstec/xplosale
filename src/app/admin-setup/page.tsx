import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import BootstrapForm from "./_form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminSetupPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  // Block once an admin already exists
  const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    redirect(me?.role === "ADMIN" ? "/admin" : "/");
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

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
          maxWidth: 440,
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow-lg)",
          padding: "clamp(32px, 5vw, 48px) clamp(28px, 5vw, 44px)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 24,
              letterSpacing: "-0.03em",
              color: "var(--ink)",
              margin: "0 0 6px",
            }}
          >
            Admin Setup
          </h1>
          <p style={{ fontSize: 14, color: "var(--ink-faint)", margin: 0 }}>
            No admin account exists yet. Claim admin access for your account.
          </p>
        </div>

        <div
          style={{
            background: "var(--paper)",
            borderRadius: 12,
            padding: "14px 16px",
            fontSize: 14,
            color: "var(--ink-soft)",
          }}
        >
          <strong style={{ color: "var(--ink)" }}>{me?.name ?? "You"}</strong>
          {me?.email && (
            <span style={{ color: "var(--ink-faint)" }}> · {me.email}</span>
          )}
        </div>

        <BootstrapForm />

        <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0, textAlign: "center" }}>
          This page becomes inaccessible once an admin exists.
        </p>
      </div>
    </main>
  );
}
