import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; imageId: string }> };

/** DELETE /api/shops/[id]/images/[imageId] — remove a shop image */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, imageId } = await params;

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const image = await prisma.shopImage.findUnique({
      where: { id: imageId },
      select: { id: true, shopId: true },
    });
    if (!image || image.shopId !== shopId) return err("Image not found", 404);

    await prisma.shopImage.delete({ where: { id: imageId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
