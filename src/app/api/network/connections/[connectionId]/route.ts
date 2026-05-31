import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({ action: z.enum(["accept", "reject", "block"]) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { connectionId } = await params;

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) return err("Connection not found", 404);
    if (connection.recipientId !== userId) return err("Forbidden", 403);

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action } = parsed.data;
    const statusMap = { accept: "ACCEPTED", reject: "REJECTED", block: "BLOCKED" } as const;

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: statusMap[action],
        acceptedAt: action === "accept" ? new Date() : undefined,
      },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { connectionId } = await params;

    const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
    if (!connection) return err("Connection not found", 404);
    if (connection.requesterId !== userId && connection.recipientId !== userId) {
      return err("Forbidden", 403);
    }

    await prisma.connection.delete({ where: { id: connectionId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
