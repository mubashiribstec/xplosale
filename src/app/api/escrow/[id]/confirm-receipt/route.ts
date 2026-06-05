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

    // Conditional write: only transition if still HELD. This closes the
    // read-then-write race where a concurrent dispute/resolve could flip the
    // status between our check above and this update (double release of funds).
    const result = await prisma.escrowTransaction.updateMany({
      where: { id, status: "HELD" },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
    if (result.count === 0) return err("Escrow is no longer in HELD status", 409);

    await createNotification(escrow.sellerId, "OFFER", {
      escrowId: id,
      body: "Buyer confirmed receipt — funds released",
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
