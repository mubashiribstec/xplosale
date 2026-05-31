import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return err("Listing not found", 404);

    const [updated] = await prisma.$transaction([
      prisma.listing.update({ where: { id: listingId }, data: { status: "ACTIVE" } }),
      prisma.adminActionLog.create({
        data: { adminId, action: "APPROVE_LISTING", targetType: "Listing", targetId: listingId },
      }),
    ]);

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
