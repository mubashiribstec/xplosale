import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { findConnection } from "@/core/network/connectionGuard";
import { createNotification } from "@/core/messaging/rooms";
import { z } from "zod";

const userSelect = {
  select: {
    id: true,
    name: true,
    networkProfile: { select: { handle: true, headline: true } },
  },
} as const;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const connections = await prisma.connection.findMany({
      where: { OR: [{ requesterId: userId }, { recipientId: userId }] },
      include: { requester: userSelect, recipient: userSelect },
      orderBy: { id: "desc" },
      // Safety bound against unbounded result sets. A user with more than this
      // many connections should move to cursor pagination here.
      take: 500,
    });

    return ok({ connections });
  } catch (e) {
    return parseError(e);
  }
}

const schema = z.object({ recipientId: z.string().cuid() });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { recipientId } = parsed.data;

    if (recipientId === userId) return err("Cannot connect with yourself", 422);

    const existing = await findConnection(userId, recipientId);
    if (existing && existing.status !== "REJECTED") {
      return err("Connection already exists", 422);
    }

    const connection = await prisma.connection.create({
      data: { requesterId: userId, recipientId },
    });

    await createNotification(recipientId, "CONNECTION_REQ", {
      requesterId: userId,
      requesterName: (session.user as { name?: string | null }).name ?? null,
    });

    return ok(connection, 201);
  } catch (e) {
    return parseError(e);
  }
}
