import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";
import { z } from "zod";
import { Prisma } from "@prisma/client";

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

    let connection;
    try {
      connection = await prisma.$transaction(async (tx) => {
        const existing = await tx.connection.findFirst({
          where: {
            OR: [
              { requesterId: userId, recipientId },
              { requesterId: recipientId, recipientId: userId },
            ],
          },
        });
        if (existing && existing.status !== "REJECTED") {
          throw Object.assign(new Error("CONNECTION_EXISTS"), { code: "CONNECTION_EXISTS" });
        }
        return tx.connection.create({ data: { requesterId: userId, recipientId } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (e) {
      if (e instanceof Error && (e as { code?: string }).code === "CONNECTION_EXISTS") {
        return err("Connection already exists", 422);
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return err("Connection already exists", 422);
      }
      throw e;
    }

    await createNotification(recipientId, "CONNECTION_REQ", {
      requesterId: userId,
      requesterName: (session.user as { name?: string | null }).name ?? null,
    });

    return ok(connection, 201);
  } catch (e) {
    return parseError(e);
  }
}
