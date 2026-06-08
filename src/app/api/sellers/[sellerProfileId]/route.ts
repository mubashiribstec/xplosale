import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sellerProfileId: string }> }
) {
  try {
    const { sellerProfileId } = await params;

    const profile = await prisma.sellerProfile.findUnique({
      where: { id: sellerProfileId },
      select: {
        id: true,
        agentTier: true,
        bio: true,
        areasServed: true,
        sellerRatingAvg: true,
        sellerRatingCount: true,
        responseRate: true,
        lastActiveAt: true,
        badges: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            verificationStatus: true,
            isPartner: true,
            createdAt: true,
          },
        },
        listings: {
          where: { status: "ACTIVE" },
          take: 12,
          orderBy: { createdAt: "desc" },
          include: {
            images: { take: 1, orderBy: { order: "asc" } },
            region: { select: { name: true, city: true } },
          },
        },
        sellerReviews: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (!profile) return err("Seller profile not found", 404);

    return ok(profile);
  } catch (e) {
    return parseError(e);
  }
}
