import { type ChatContext, type NotificationKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kv } from "@/core/adapters/kv";

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

export async function publishMessage(roomId: string, message: object): Promise<void> {
  try {
    await kv.publish(`chat:room:${roomId}`, JSON.stringify(message));
  } catch {
    // Redis pub/sub may not be available in all envs
  }
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
