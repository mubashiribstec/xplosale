import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/shops/[id]/submit
 * Transition a DRAFT shop to PENDING_REVIEW.
 * Phase B will add the storefront-board photo requirement here.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        name: true,
        category: true,
        type: true,
        description: true,
        addressLine: true,
        regionId: true,
      },
    });

    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);
    if (shop.status !== "DRAFT" && shop.status !== "REJECTED") {
      return err("Only DRAFT or REJECTED shops can be submitted for review.", 422);
    }

    // Basic completeness check — all required fields must be non-empty
    if (!shop.name || !shop.category || !shop.type || !shop.description || !shop.addressLine || !shop.regionId) {
      return err("Please complete all required shop fields before submitting.", 422);
    }

    const updated = await prisma.shop.update({
      where: { id },
      data: { status: "PENDING_REVIEW" },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
