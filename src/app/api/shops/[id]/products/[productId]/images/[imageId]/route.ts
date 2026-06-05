import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; productId: string; imageId: string }> };

/** DELETE /api/shops/[id]/products/[productId]/images/[imageId] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, productId, imageId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const image = await prisma.shopProductImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });
    if (!image || image.productId !== productId) return err("Image not found", 404);

    await prisma.shopProductImage.delete({ where: { id: imageId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
