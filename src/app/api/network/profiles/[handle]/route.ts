import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;

    const profile = await prisma.networkProfile.findUnique({
      where: { handle },
      include: {
        user: { select: { id: true, name: true } },
        experiences: true,
        educations: true,
        profileSkills: { include: { skill: { select: { id: true, name: true } } } },
        endorsementsReceived: {
          take: 20,
          include: {
            skill: { select: { id: true, name: true } },
            giverProfile: { select: { handle: true, user: { select: { name: true } } } },
          },
        },
        posts: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { likes: true, comments: true } } },
        },
      },
    });

    if (!profile) return err("Profile not found", 404);

    if (profile.visibility === "CONNECTIONS") {
      const session = await getSession();
      const callerId = session ? getUserId(session) : null;

      let isConnected = false;
      if (callerId && callerId !== profile.userId) {
        const conn = await prisma.connection.findFirst({
          where: {
            OR: [
              { requesterId: callerId, recipientId: profile.userId },
              { requesterId: profile.userId, recipientId: callerId },
            ],
            status: "ACCEPTED",
          },
        });
        isConnected = !!conn;
      } else if (callerId === profile.userId) {
        isConnected = true;
      }

      if (!isConnected) {
        return ok({ id: profile.id, handle: profile.handle, headline: profile.headline, visibility: "CONNECTIONS" as const });
      }
    }

    const connectionCount = await prisma.connection.count({
      where: {
        OR: [{ requesterId: profile.userId }, { recipientId: profile.userId }],
        status: "ACCEPTED",
      },
    });

    return ok({ ...profile, connectionCount });
  } catch (e) {
    return parseError(e);
  }
}
