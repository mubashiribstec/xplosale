import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const [myProfile, acceptedConnections] = await Promise.all([
      prisma.networkProfile.findUnique({ where: { userId }, select: { id: true } }),
      prisma.connection.findMany({
        where: {
          OR: [{ requesterId: userId }, { recipientId: userId }],
          status: "ACCEPTED",
        },
        select: { requesterId: true, recipientId: true },
      }),
    ]);
    if (!myProfile) return ok({ posts: [] });

    const connectedUserIds = acceptedConnections.map((c) =>
      c.requesterId === userId ? c.recipientId : c.requesterId
    );

    const feedUserIds = [userId, ...connectedUserIds];

    const posts = await prisma.post.findMany({
      where: { authorProfile: { userId: { in: feedUserIds } } },
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

    const postsWithLike = posts.map((p) => ({ ...p, likedByMe: likedSet.has(p.id) }));

    return ok({ posts: postsWithLike });
  } catch (e) {
    return parseError(e);
  }
}
