import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getSession } from "@/core/auth/session";
import Navbar from "@/components/layout/Navbar";

const NAV = [
  { href: "/partner", label: "Overview", icon: "◻" },
  { href: "/partner/listings", label: "Listings", icon: "◻" },
  { href: "/partner/jobs", label: "Jobs", icon: "◻" },
  { href: "/me", label: "Account", icon: "◻" },
];

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // /partner/register is accessible to all logged-in users — skip sidebar layout
  if (pathname === "/partner/register") {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  const session = await getSession();
  if (!session) redirect("/login?callbackUrl=/partner");

  const role = (session.user as { role?: string })?.role;
  if (role !== "PARTNER" && role !== "ADMIN") redirect("/partner/register");

  return (
    <>
    <Navbar />
    <div
      style={{
        minHeight: "100vh",
        background: "var(--paper)",
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        fontFamily: "var(--body)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          background: "var(--white)",
          borderRight: "1px solid var(--line)",
          padding: "28px 16px",
          position: "sticky",
          top: 62,
          height: "calc(100vh - 62px)",
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            margin: "0 0 12px 8px",
          }}
        >
          Partner
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: "9px 12px",
                borderRadius: 9,
                fontSize: 14,
                fontWeight: 500,
                color: "var(--ink-soft)",
                textDecoration: "none",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--paper-2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div style={{ padding: "clamp(24px, 4vw, 48px) clamp(16px, 4vw, 40px)" }}>
        {children}
      </div>
    </div>
    </>
  );
}
