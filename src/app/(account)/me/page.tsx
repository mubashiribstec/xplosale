import { redirect } from "next/navigation";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

export default async function MePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = session.user as { id: string; phone: string; name: string; role: string };

  const [sellerProfile, jobSeekerProfile, employerProfile, networkProfile] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { userId: user.id } }),
    prisma.jobSeekerProfile.findUnique({ where: { userId: user.id } }),
    prisma.employerProfile.findUnique({ where: { userId: user.id }, include: { company: true } }),
    prisma.networkProfile.findUnique({ where: { userId: user.id } }),
  ]);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { verificationStatus: true, name: true, phone: true, role: true },
  });

  const isVerified = dbUser?.verificationStatus === "VERIFIED";
  const isPending = dbUser?.verificationStatus === "PENDING";

  const facets = [
    {
      id: "seller",
      title: "Seller",
      description: "List properties, vehicles, and more for sale",
      href: "/me/seller",
      active: !!sellerProfile,
      detail: sellerProfile ? `Agent tier: ${sellerProfile.agentTier}` : null,
      icon: "🏠",
    },
    {
      id: "job-seeker",
      title: "Job Seeker",
      description: "Find jobs and track your applications",
      href: "/me/job-seeker",
      active: !!jobSeekerProfile,
      detail: jobSeekerProfile?.headline ?? null,
      icon: "💼",
    },
    {
      id: "employer",
      title: "Employer",
      description: "Post jobs and manage candidates",
      href: "/me/employer",
      active: !!employerProfile,
      detail: employerProfile?.company.name ?? null,
      icon: "🏢",
    },
    {
      id: "network",
      title: "Network",
      description: "Professional profile, connections, and feed",
      href: "/me/network",
      active: !!networkProfile,
      detail: networkProfile ? `@${networkProfile.handle}` : null,
      icon: "🔗",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Identity card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{dbUser?.name ?? user.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{dbUser?.phone ?? user.phone}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{dbUser?.role?.toLowerCase() ?? user.role?.toLowerCase()}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isVerified && <VerifiedBadge />}
              {isPending && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                  Verification pending
                </span>
              )}
            </div>
          </div>

          {!isVerified && !isPending && (
            <Link
              href="/me/verify-cnic"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
            >
              Get verified → upload CNIC
            </Link>
          )}
        </div>

        {/* Profile facets */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Profile Facets</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {facets.map((facet) => (
              <Link
                key={facet.id}
                href={facet.href}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{facet.icon}</span>
                  {facet.active ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Active</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Set up</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{facet.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{facet.detail ?? facet.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/me/verify-cnic" className="text-gray-500 hover:text-gray-700 hover:underline">
            Identity Verification
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 hover:underline">
            Admin Panel
          </Link>
        </div>
      </div>
    </main>
  );
}
