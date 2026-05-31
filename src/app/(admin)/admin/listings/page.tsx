import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import AdminListingsQueue from "@/components/shared/AdminListingsQueue";

export default async function AdminListingsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if ((session.user as { role: string }).role !== "ADMIN") redirect("/");

  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      region: { select: { id: true, name: true, city: true } },
      sellerProfile: {
        select: {
          id: true,
          agentTier: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listing Review Queue</h1>
          <p className="text-sm text-gray-500 mt-1">{listings.length} pending</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <AdminListingsQueue
            listings={listings.map((l) => ({
              ...l,
              price: l.price.toString(),
              createdAt: l.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </main>
  );
}
