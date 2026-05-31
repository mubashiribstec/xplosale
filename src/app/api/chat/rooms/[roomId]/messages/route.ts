import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { publishMessage, createNotification } from "@/core/messaging/rooms";

async function getParticipantRoom(roomId: string, userId: string) {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) return null;
  if (room.participantAId !== userId && room.participantBId !== userId) return null;
  return room;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { roomId } = await params;
    const room = await getParticipantRoom(roomId, userId);
    if (!room) return err("Room not found", 404);

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return ok(messages);
  } catch (e) {
    return parseError(e);
  }
}

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
  kind: z.enum(["TEXT"]).default("TEXT"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { roomId } = await params;
    const room = await getParticipantRoom(roomId, userId);
    if (!room) return err("Room not found", 404);

    const body = await req.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: userId,
        body: parsed.data.body,
        kind: parsed.data.kind,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    await publishMessage(roomId, message);

    const otherUserId =
      room.participantAId === userId ? room.participantBId : room.participantAId;

    await createNotification(otherUserId, "MESSAGE", {
      roomId,
      messageId: message.id,
      senderName: sender?.name ?? "",
      preview: parsed.data.body.slice(0, 100),
    });

    return ok(message, 201);
  } catch (e) {
    return parseError(e);
  }
}
