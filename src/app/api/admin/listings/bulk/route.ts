import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["approve", "reject"]),
  reason: z.string().min(5).optional(),
});

const CHUNK_SIZE = 20;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { ids, action, reason } = parsed.data;
    if (action === "reject" && (!reason || reason.length < 5)) {
      return err("Validation error", 422, { reason: ["Reason must be at least 5 characters"] });
    }

    let succeeded = 0;
    let failed = 0;
    const toNotify: Array<{ userId: string; listingId: string }> = [];

    for (const idGroup of chunk(ids, CHUNK_SIZE)) {
      const listings = await prisma.listing.findMany({
        where: { id: { in: idGroup } },
        include: { sellerProfile: { select: { userId: true } } },
      });
      const found = new Set(listings.map((l) => l.id));
      failed += idGroup.filter((id) => !found.has(id)).length;
      if (listings.length === 0) continue;

      const ops = listings.flatMap((listing) => [
        prisma.listing.update({
          where: { id: listing.id },
          data: { status: action === "approve" ? "ACTIVE" : "REJECTED" },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: action === "approve" ? "APPROVE_LISTING_BULK" : "REJECT_LISTING_BULK",
            targetType: "Listing",
            targetId: listing.id,
            reason: action === "reject" ? reason : undefined,
          },
        }),
      ]);

      await prisma.$transaction(ops);
      succeeded += listings.length;

      if (action === "reject") {
        for (const listing of listings) {
          toNotify.push({ userId: listing.sellerProfile.userId, listingId: listing.id });
        }
      }
    }

    if (action === "reject" && reason) {
      for (const { userId, listingId } of toNotify) {
        await createNotification(userId, "ADMIN", { listingId, status: "REJECTED", reason });
      }
    }

    return ok({ succeeded, failed });
  } catch (e) {
    return parseError(e);
  }
}
