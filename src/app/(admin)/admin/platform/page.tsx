import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Platform — Admin", robots: { index: false, follow: false } };

export default async function AdminPlatformPage() {
  const [
    totalUsers,
    verifiedUsers,
    partnerUsers,
    bannedUsers,
    activeListings,
    pendingListings,
    activeJobs,
    pendingVerifications,
    pendingPartners,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.user.count({ where: { isPartner: true } }),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
    prisma.listing.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.jobPosting.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { verificationStatus: "PENDING" } }),
    prisma.partnerApplication.count({ where: { status: "PENDING" } }),
  ]);

  const metrics = [
    { label: "Total Users", value: totalUsers, color: "gray" },
    { label: "Verified Users", value: verifiedUsers, color: "green" },
    { label: "Partner Accounts", value: partnerUsers, color: "amber" },
    { label: "Banned Users", value: bannedUsers, color: "red" },
    { label: "Active Listings", value: activeListings, color: "blue" },
    { label: "Pending Listings", value: pendingListings, color: "yellow" },
    { label: "Active Jobs", value: activeJobs, color: "blue" },
    { label: "Pending Verifications", value: pendingVerifications, color: "yellow" },
    { label: "Pending Partner Apps", value: pendingPartners, color: "yellow" },
  ];

  const colorMap: Record<string, { bg: string; text: string }> = {
    gray:   { bg: "#f9fafb", text: "#374151" },
    green:  { bg: "#f0fdf4", text: "#16a34a" },
    amber:  { bg: "#fffbeb", text: "#d97706" },
    red:    { bg: "#fef2f2", text: "#dc2626" },
    blue:   { bg: "#eff6ff", text: "#2563eb" },
    yellow: { bg: "#fefce8", text: "#ca8a04" },
  };

  const envInfo = [
    { key: "NODE_ENV", value: process.env.NODE_ENV ?? "—" },
    { key: "STORAGE_MODE", value: process.env.STORAGE_MODE ?? "—" },
    { key: "Google OAuth", value: process.env.GOOGLE_CLIENT_ID ? "Configured" : "Not configured" },
    { key: "Upstash Redis", value: process.env.UPSTASH_REDIS_URL ? "Configured" : "Not configured" },
    { key: "Upstash REST", value: process.env.UPSTASH_REDIS_REST_URL ? "Configured" : "Not configured" },
    { key: "Admin email", value: process.env.ADMIN_EMAIL ?? "—" },
    { key: "Analytics", value: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true" ? "Enabled" : "Disabled" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>

      {/* Live metrics */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Live Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map(({ label, value, color }) => {
            const c = colorMap[color];
            return (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color: c.text }}>
                  {value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Environment / config status */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Environment</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {envInfo.map(({ key, value }) => (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700 w-48">{key}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Queue health */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Queues Requiring Attention</h2>
        <div className="flex flex-wrap gap-3">
          {pendingVerifications > 0 && (
            <Link href="/admin/verifications" className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm font-semibold text-yellow-700 hover:bg-yellow-100 transition-colors no-underline">
              {pendingVerifications} pending verification{pendingVerifications !== 1 ? "s" : ""}
            </Link>
          )}
          {pendingPartners > 0 && (
            <Link href="/admin/partners" className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition-colors no-underline">
              {pendingPartners} partner application{pendingPartners !== 1 ? "s" : ""}
            </Link>
          )}
          {pendingListings > 0 && (
            <Link href="/admin/listings" className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors no-underline">
              {pendingListings} listing{pendingListings !== 1 ? "s" : ""} awaiting review
            </Link>
          )}
          {pendingVerifications === 0 && pendingPartners === 0 && pendingListings === 0 && (
            <p className="text-sm text-gray-400">All queues clear.</p>
          )}
        </div>
      </section>
    </div>
  );
}
