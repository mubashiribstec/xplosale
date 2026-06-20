import { type ChatContext, type ChatRoom, type NotificationKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publish } from "@/core/realtime/bus";

/** Real-time channel for a chat room. */
export function roomChannel(roomId: string): string {
  return `rt:chat:${roomId}`;
}

/** Any admin may access an ADMIN_DM room, not just the two pinned participants. */
export function canAccessChatRoom(
  room: Pick<ChatRoom, "participantAId" | "participantBId" | "contextType">,
  userId: string,
  userRole?: string
): boolean {
  if (room.participantAId === userId || room.participantBId === userId) return true;
  return room.contextType === "ADMIN_DM" && userRole === "ADMIN";
}

/** For ADMIN_DM rooms, resolve the non-admin participant (the customer). */
export async function getSupportCustomerId(room: Pick<ChatRoom, "participantAId" | "participantBId">): Promise<string> {
  const [a, b] = await Promise.all([
    prisma.user.findUnique({ where: { id: room.participantAId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: room.participantBId }, select: { role: true } }),
  ]);
  if (a?.role !== "ADMIN") return room.participantAId;
  if (b?.role !== "ADMIN") return room.participantBId;
  return room.participantBId;
}

export async function getOrCreateRoom(
  contextType: ChatContext,
  contextId: string,
  participantAId: string,
  participantBId: string
) {
  const [pA, pB] = [participantAId, participantBId].sort();
  return prisma.chatRoom.upsert({
    where: {
      contextType_contextId_participantAId_participantBId: {
        contextType,
        contextId,
        participantAId: pA,
        participantBId: pB,
      },
    },
    update: {},
    create: {
      contextType,
      contextId,
      participantAId: pA,
      participantBId: pB,
    },
  });
}

/** Broadcast a new message to everyone watching the room (live, no refresh). */
export async function publishMessage(roomId: string, message: object): Promise<void> {
  publish(roomChannel(roomId), JSON.stringify({ t: "msg", m: message }));
}

/** Broadcast a transient "user is typing" signal (not persisted). */
export function publishTyping(roomId: string, user: { userId: string; name: string | null }): void {
  publish(roomChannel(roomId), JSON.stringify({ t: "typing", userId: user.userId, name: user.name }));
}

export async function createNotification(
  userId: string,
  kind: NotificationKind,
  payload: Record<string, unknown>
) {
  return prisma.notification.create({
    data: { userId, kind, payload: payload as Prisma.InputJsonValue },
  });
}
