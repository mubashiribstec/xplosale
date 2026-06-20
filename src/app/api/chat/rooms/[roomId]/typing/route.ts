import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessChatRoom, publishTyping } from "@/core/messaging/rooms";

// Lightweight in-memory throttle so typing pings never depend on Redis.
const lastPing = new Map<string, number>();
const MIN_INTERVAL_MS = 1500;

/** POST /api/chat/rooms/[roomId]/typing — broadcast a transient typing signal. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role?: string }).role;

    const { roomId } = await params;

    const key = `${roomId}:${userId}`;
    const now = Date.now();
    const prev = lastPing.get(key) ?? 0;
    if (now - prev < MIN_INTERVAL_MS) return ok({ throttled: true });
    lastPing.set(key, now);

    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room || !canAccessChatRoom(room, userId, userRole)) return err("Room not found", 404);

    const bannedAt = (session.user as { bannedAt?: string | null }).bannedAt;
    if (bannedAt && room.contextType !== "ADMIN_DM") return err("Account suspended", 403);

    const name = (session.user as { name?: string | null }).name ?? null;
    publishTyping(roomId, { userId, name });

    return ok({ sent: true });
  } catch (e) {
    return parseError(e);
  }
}
