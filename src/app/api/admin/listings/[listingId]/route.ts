import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ listingId: string }> };

/** DELETE /api/admin/listings/[listingId] — hard-delete a listing */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { listingId } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, title: true },
    });
    if (!listing) return err("Listing not found", 404);

    await prisma.$transaction([
      prisma.listing.delete({ where: { id: listingId } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "LISTING_DELETED",
          targetType: "Listing",
          targetId: listingId,
          reason: `Deleted listing: ${listing.title}`,
        },
      }),
    ]);

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
