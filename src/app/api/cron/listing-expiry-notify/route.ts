import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/** GET /api/cron/listing-expiry-notify
 * Notify sellers when their listing expires in ≤7 days.
 * Run daily via cron with Authorization: Bearer <RECOMMENDATION_CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== process.env.RECOMMENDATION_CRON_SECRET) {
      return err("Forbidden", 403);
    }

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find ACTIVE listings expiring within 7 days that haven't been notified recently
    const listings = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { gte: now, lte: in7Days },
      },
      select: {
        id: true,
        title: true,
        expiresAt: true,
        sellerProfile: { select: { userId: true } },
      },
      take: 500,
    });

    let notified = 0;
    for (const listing of listings) {
      const daysLeft = Math.ceil(
        (listing.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      // Avoid duplicate notifications: check if one was sent in the last 24h for this listing
      const existing = await prisma.notification.findFirst({
        where: {
          userId: listing.sellerProfile.userId,
          kind: "PRICE_DROP", // reuse closest kind; ideally add LISTING_EXPIRY_SOON to enum
          payload: { path: ["listingId"], equals: listing.id },
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });
      if (existing) continue;

      await prisma.notification.create({
        data: {
          userId: listing.sellerProfile.userId,
          kind: "ADMIN",
          payload: {
            type: "LISTING_EXPIRY_SOON",
            listingId: listing.id,
            title: listing.title,
            daysLeft,
            expiresAt: listing.expiresAt!.toISOString(),
          },
        },
      });
      notified++;
    }

    return ok({ notified, checked: listings.length });
  } catch (e) {
    return parseError(e);
  }
}
