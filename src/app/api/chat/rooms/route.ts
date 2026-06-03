import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom } from "@/core/messaging/rooms";
import { rateLimit } from "@/lib/rate-limit";

const createRoomSchema = z.object({
  contextType: z.enum(["LISTING", "JOB_APPLICATION", "NETWORK_DM"]),
  contextId: z.string().min(1),
  otherUserId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const myUserId = getUserId(session);

    const limited = await rateLimit(`chat:room:${myUserId}`, 10, 3600);
    if (!limited.allowed) return err("Too many requests", 429);

    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { contextType, contextId, otherUserId } = parsed.data;
    if (myUserId === otherUserId) return err("Cannot create room with yourself", 400);

    const [pA, pB] = [myUserId, otherUserId].sort();
    const room = await getOrCreateRoom(contextType, contextId, pA, pB);
    return ok(room, 200);
  } catch (e) {
    return parseError(e);
  }
}

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [{ participantAId: userId }, { participantBId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        participantA: { select: { id: true, name: true } },
        participantB: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(rooms);
  } catch (e) {
    return parseError(e);
  }
}
