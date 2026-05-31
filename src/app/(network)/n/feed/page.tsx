import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import NetworkFeed from "@/components/shared/NetworkFeed";

export default async function NetworkFeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const myProfile = await prisma.networkProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!myProfile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No network profile yet</h2>
          <p className="text-gray-500 mb-4">Set up your profile to access the feed.</p>
          <a
            href="/me/network"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Create Profile
          </a>
        </div>
      </main>
    );
  }

  const acceptedConnections = await prisma.connection.findMany({
    where: {
      OR: [{ requesterId: userId }, { recipientId: userId }],
      status: "ACCEPTED",
    },
    select: { requesterId: true, recipientId: true },
  });

  const connectedUserIds = acceptedConnections.map((c) =>
    c.requesterId === userId ? c.recipientId : c.requesterId
  );

  const connectedProfiles = await prisma.networkProfile.findMany({
    where: { userId: { in: connectedUserIds } },
    select: { id: true },
  });

  const profileIds = [myProfile.id, ...connectedProfiles.map((p) => p.id)];

  const posts = await prisma.post.findMany({
    where: { authorProfileId: { in: profileIds } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      authorProfile: {
        select: {
          id: true,
          handle: true,
          headline: true,
          profilePhotoUrl: true,
          user: { select: { id: true, name: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const postIds = posts.map((p) => p.id);
  const myLikes = await prisma.postLike.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  const likedSet = new Set(myLikes.map((l) => l.postId));

  const postsWithMeta = posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    likedByMe: likedSet.has(p.id),
  }));

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Network Feed</h1>
          <a href="/n/people" className="text-sm text-blue-600 hover:underline">
            Discover People
          </a>
        </div>
        <NetworkFeed posts={postsWithMeta} currentUserId={userId} ownProfileId={myProfile.id} />
      </div>
    </main>
  );
}
