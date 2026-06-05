import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";

const schema = z.object({
  outcome: z.enum(["release", "refund"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const isAdmin = (session.user as { role: string }).role === "ADMIN";
    if (!isAdmin) return err("Forbidden", 403);

    const { id } = await params;

    const escrow = await prisma.escrowTransaction.findUnique({ where: { id } });
    if (!escrow) return err("Escrow not found", 404);
    if (escrow.status !== "DISPUTED") return err("Escrow is not in DISPUTED status", 422);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { outcome } = parsed.data;

    if (outcome === "release") {
      // Conditional write: only resolve if still DISPUTED, preventing a
      // double-resolve from two concurrent admin actions.
      const result = await prisma.escrowTransaction.updateMany({
        where: { id, status: "DISPUTED" },
        data: { status: "RELEASED", releasedAt: new Date() },
      });
      if (result.count === 0) return err("Escrow is no longer in DISPUTED status", 409);

      await createNotification(escrow.buyerId, "ADMIN", {
        escrowId: id,
        body: "Admin resolved the dispute — funds released to seller",
      });
      await createNotification(escrow.sellerId, "ADMIN", {
        escrowId: id,
        body: "Admin resolved the dispute — funds released to you",
      });
    } else {
      const result = await prisma.escrowTransaction.updateMany({
        where: { id, status: "DISPUTED" },
        data: { status: "REFUNDED", refundedAt: new Date() },
      });
      if (result.count === 0) return err("Escrow is no longer in DISPUTED status", 409);

      await createNotification(escrow.buyerId, "ADMIN", {
        escrowId: id,
        body: "Admin resolved the dispute — funds refunded to you",
      });
      await createNotification(escrow.sellerId, "ADMIN", {
        escrowId: id,
        body: "Admin resolved the dispute — funds refunded to buyer",
      });
    }

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
