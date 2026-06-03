import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as { role: string }).role === "ADMIN";

    const { id } = await params;

    const escrow = await prisma.escrowTransaction.findUnique({
      where: { id },
      include: {
        listing: { select: { title: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    if (!escrow) return err("Escrow not found", 404);

    if (!isAdmin && escrow.buyerId !== userId && escrow.sellerId !== userId) {
      return err("Forbidden", 403);
    }

    const counterparty =
      escrow.buyerId === userId
        ? escrow.seller
        : escrow.buyer;

    return ok({
      id: escrow.id,
      status: escrow.status,
      amount: escrow.amount.toString(),
      currency: escrow.currency,
      createdAt: escrow.createdAt,
      releasedAt: escrow.releasedAt,
      refundedAt: escrow.refundedAt,
      listing: { title: escrow.listing.title },
      counterparty: { id: counterparty.id, name: counterparty.name },
    });
  } catch (e) {
    return parseError(e);
  }
}
