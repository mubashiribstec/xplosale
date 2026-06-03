import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";

const schema = z.object({
  reason: z.string().max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;

    const escrow = await prisma.escrowTransaction.findUnique({ where: { id } });
    if (!escrow) return err("Escrow not found", 404);
    if (escrow.buyerId !== userId && escrow.sellerId !== userId) return err("Forbidden", 403);
    if (escrow.status !== "HELD") return err("Escrow is not in HELD status", 422);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { reason } = parsed.data;

    await prisma.escrowTransaction.update({
      where: { id },
      data: { status: "DISPUTED" },
    });

    // Notify the other party
    const otherPartyId = escrow.buyerId === userId ? escrow.sellerId : escrow.buyerId;
    await createNotification(otherPartyId, "ADMIN", {
      escrowId: id,
      body: `A dispute has been raised: ${reason}`,
    });

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        createNotification(admin.id, "ADMIN", {
          escrowId: id,
          body: `Escrow dispute filed: ${reason}`,
        })
      )
    );

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
