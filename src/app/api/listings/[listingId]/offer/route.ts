import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom, publishMessage, createNotification } from "@/core/messaging/rooms";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  amount: z.number().positive(),
  message: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const buyerId = getUserId(session);

    const limited = await rateLimit(`listings:offer:${buyerId}`, 20, 3600);
    if (!limited.allowed) return err("Too many requests", 429);

    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        sellerProfile: {
          select: { user: { select: { id: true, name: true } } },
        },
      },
    });
    if (!listing) return err("Listing not found", 404);
    if (listing.status !== "ACTIVE") return err("Listing is not active", 422);

    const sellerId = listing.sellerProfile.user.id;
    if (buyerId === sellerId) return err("Cannot make an offer on your own listing", 422);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { amount, message } = parsed.data;

    const [pA, pB] = [buyerId, sellerId].sort();
    const room = await getOrCreateRoom("LISTING", listingId, pA, pB);

    const msg = await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: buyerId,
        body: message ?? "Offer sent",
        kind: "OFFER",
        metadata: { amount, currency: listing.currency },
      },
    });

    await createNotification(sellerId, "OFFER", {
      roomId: room.id,
      listingId,
      amount,
      senderName: (session.user as { name?: string }).name ?? "Someone",
    });

    await publishMessage(room.id, { type: "message", message: msg });

    return ok({ roomId: room.id });
  } catch (e) {
    return parseError(e);
  }
}
