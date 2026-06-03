import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;

    const escrow = await prisma.escrowTransaction.findUnique({ where: { id } });
    if (!escrow) return err("Escrow not found", 404);
    if (escrow.buyerId !== userId) return err("Forbidden", 403);
    if (escrow.status !== "HELD") return err("Escrow is not in HELD status", 422);

    await prisma.escrowTransaction.update({
      where: { id },
      data: { status: "RELEASED", releasedAt: new Date() },
    });

    await createNotification(escrow.sellerId, "OFFER", {
      escrowId: id,
      body: "Buyer confirmed receipt — funds released",
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
