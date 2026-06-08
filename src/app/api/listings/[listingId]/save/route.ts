import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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

    try {
      await prisma.$transaction([
        prisma.savedListing.delete({
          where: { userId_listingId: { userId, listingId } },
        }),
        prisma.listing.update({
          where: { id: listingId },
          data: { savedCount: { decrement: 1 } },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        // Already unsaved — idempotent
        return ok({ saved: false });
      }
      throw e;
    }

    return ok({ saved: false });
  } catch (e) {
    return parseError(e);
  }
}
