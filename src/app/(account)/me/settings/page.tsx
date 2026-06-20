import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import SettingsActions from "./_settings-actions";

export const metadata: Metadata = { title: "Account & Settings", robots: { index: false, follow: false } };

const SETTINGS_LINKS = [
  { label: "Identity verification", href: "/me/verify-identity", desc: "Verify your CNIC/passport to earn a verified badge." },
  { label: "Partner application", href: "/me/partner-application", desc: "Apply to become a verified partner/employer." },
  { label: "Shopkeeper application", href: "/me/shop-application", desc: "Apply for permission to open a shop." },
  { label: "Saved searches", href: "/me/saved-searches", desc: "Manage your saved search alerts." },
];

const ROLE_LABEL: Record<string, string> = {
  USER: "Member",
  PARTNER: "Partner",
  ADMIN: "Administrator",
};

export default async function AccountSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/me/settings");
  const sessionUser = session.user as { id: string };

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { email: true, role: true, createdAt: true, languagePref: true, isSuperAdmin: true },
  });
  if (!user) redirect("/login");

  const rowStyle: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 0", borderBottom: "1px solid var(--line)", gap: 16,
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", padding: "clamp(24px,4vw,48px) clamp(16px,4vw,32px)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/me"
          style={{ fontSize: 13, color: "var(--ink-faint)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}
        >
          ← My Profile
        </Link>

        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "clamp(26px,4vw,36px)", color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.1 }}>
          Account &amp; Settings
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-faint)", margin: "0 0 32px", fontFamily: "var(--body)" }}>
          Manage your account, preferences, and security. Edit your public profile details on{" "}
          <Link href="/me" style={{ color: "var(--clay)", textDecoration: "none", fontWeight: 600 }}>My Profile</Link>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Account info */}
          <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 28px", fontFamily: "var(--body)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 8px" }}>
              Account
            </p>
            <div style={rowStyle}>
              <span style={{ fontSize: 14, color: "var(--ink-faint)" }}>Email</span>
              <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{user.email ?? "—"}</span>
            </div>
            <div style={rowStyle}>
              <span style={{ fontSize: 14, color: "var(--ink-faint)" }}>Account type</span>
              <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                {user.isSuperAdmin ? "Super Admin" : (ROLE_LABEL[user.role] ?? user.role)}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span style={{ fontSize: 14, color: "var(--ink-faint)" }}>Member since</span>
              <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                {user.createdAt.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Settings links */}
          <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 20, padding: "24px 28px", fontFamily: "var(--body)" }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "0 0 8px" }}>
              Verification &amp; applications
            </p>
            {SETTINGS_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
                  padding: "14px 0", textDecoration: "none",
                  borderBottom: i < SETTINGS_LINKS.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <span>
                  <span style={{ display: "block", fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{link.label}</span>
                  <span style={{ display: "block", fontSize: 12.5, color: "var(--ink-faint)", marginTop: 2 }}>{link.desc}</span>
                </span>
                <span style={{ fontSize: 16, color: "var(--ink-faint)" }}>→</span>
              </Link>
            ))}
          </div>

          {/* Interactive: language, sign out, delete */}
          <SettingsActions initialLocale={user.languagePref} />
        </div>
      </div>
    </main>
  );
}
