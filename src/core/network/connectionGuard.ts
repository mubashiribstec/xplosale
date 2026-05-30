import { prisma } from "@/lib/prisma";
import type { ConnectionStatus } from "@prisma/client";

/**
 * Find an existing connection between two users in either direction.
 * Use this before creating a new Connection row to prevent bidirectional duplicates.
 * The schema @@unique only covers (A→B); (B→A) is a separate valid row without this check.
 */
export async function findConnection(userAId: string, userBId: string) {
  return prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId: userAId, recipientId: userBId },
        { requesterId: userBId, recipientId: userAId },
      ],
    },
  });
}

export async function getConnectionStatus(
  userAId: string,
  userBId: string
): Promise<ConnectionStatus | null> {
  const conn = await findConnection(userAId, userBId);
  return conn?.status ?? null;
}
