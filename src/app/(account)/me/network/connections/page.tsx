import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import ConnectionManager from "@/components/shared/ConnectionManager";

export default async function ConnectionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: userId }, { recipientId: userId }] },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          networkProfile: { select: { handle: true, headline: true } },
        },
      },
      recipient: {
        select: {
          id: true,
          name: true,
          networkProfile: { select: { handle: true, headline: true } },
        },
      },
    },
    orderBy: { id: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Connections</h1>
          <a href="/me/network" className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to Profile
          </a>
        </div>
        <ConnectionManager connections={connections} currentUserId={userId} />
      </div>
    </main>
  );
}
