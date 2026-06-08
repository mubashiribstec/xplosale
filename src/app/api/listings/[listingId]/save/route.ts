import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { listingId } = await params;

    const saved = await prisma.savedListing.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });

    return ok({ saved: saved !== null });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { listingId } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { sellerProfile: { select: { userId: true } } },
    });
    if (!listing) return err("Listing not found", 404);
    if (listing.sellerProfile?.userId === userId) {
      return err("You cannot save your own listing", 403);
    }

    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
    });

    await prisma.listing.update({
      where: { id: listingId },
      data: { savedCount: { increment: 1 } },
    });

    return ok({ saved: true });
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { listingId } = await params;

    const existing = await prisma.savedListing.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });

    if (existing) {
      await prisma.savedListing.delete({
        where: { userId_listingId: { userId, listingId } },
      });

      // Clamp savedCount to 0
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        select: { savedCount: true },
      });
      if (listing && listing.savedCount > 0) {
        await prisma.listing.update({
          where: { id: listingId },
          data: { savedCount: { decrement: 1 } },
        });
      }
    }

    return ok({ saved: false });
  } catch (e) {
    return parseError(e);
  }
}
