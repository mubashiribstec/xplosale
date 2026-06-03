import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  listingId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const buyerId = getUserId(session);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { listingId } = parsed.data;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        sellerProfile: {
          select: { user: { select: { id: true } } },
        },
      },
    });

    if (!listing) return err("Listing not found", 404);
    if (listing.status !== "ACTIVE") return err("Listing is not active", 422);

    const sellerId = listing.sellerProfile.user.id;
    if (buyerId === sellerId) return err("Cannot escrow your own listing", 422);

    const existing = await prisma.escrowTransaction.findFirst({
      where: { listingId, status: "HELD" },
    });
    if (existing) return err("An active escrow already exists for this listing", 422);

    const escrow = await prisma.escrowTransaction.create({
      data: {
        listingId,
        buyerId,
        sellerId,
        amount: listing.price,
        currency: listing.currency,
      },
      select: { id: true, status: true, amount: true, currency: true },
    });

    return ok(
      { escrow: { id: escrow.id, status: escrow.status, amount: escrow.amount.toString(), currency: escrow.currency } },
      201
    );
  } catch (e) {
    return parseError(e);
  }
}
