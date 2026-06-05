import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/core/auth/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const navLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/escrow", label: "Escrow" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/security", label: "Security" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit Log" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/platform", label: "Platform" },
  { href: "/admin/shops", label: "Shops" },
  { href: "/admin/plans", label: "Plans" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  return (
    <div className="flex min-h-screen">
      <aside className="fixed top-0 left-0 h-full w-[220px] bg-gray-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-700">
          <span className="text-sm font-semibold tracking-wide uppercase text-gray-300">
            Admin
          </span>
        </div>
        <nav className="flex-1 py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center px-5 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="ml-[220px] flex-1 p-8 bg-gray-50 min-h-screen">{children}</main>
    </div>
  );
}
