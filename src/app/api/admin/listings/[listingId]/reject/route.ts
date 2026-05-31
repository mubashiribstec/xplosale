import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";

const schema = z.object({ reason: z.string().min(5) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err("Listing not found", 404);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { reason } = parsed.data;

    const [updated] = await prisma.$transaction([
      prisma.listing.update({ where: { id: listingId }, data: { status: "REJECTED" } }),
      prisma.adminActionLog.create({
        data: { adminId, action: "REJECT_LISTING", targetType: "Listing", targetId: listingId, reason },
      }),
    ]);

    await createNotification(listing.sellerProfile.userId, "LISTING_APPROVED", {
      listingId,
      status: "REJECTED",
      reason,
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
