import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).nullable().optional(),
  priceMin: z.number().positive().nullable().optional(),
  priceMax: z.number().positive().nullable().optional(),
  currency: z.string().length(3).optional(),
  isHidden: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string; productId: string }> };

/** PATCH /api/shops/[id]/products/[productId] — update a product */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, productId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true },
    });
    if (!product || product.shopId !== shopId) return err("Product not found", 404);

    const body = await req.json() as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const updated = await prisma.shopProduct.update({
      where: { id: productId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.priceMin !== undefined && { priceMin: parsed.data.priceMin }),
        ...(parsed.data.priceMax !== undefined && { priceMax: parsed.data.priceMax }),
        ...(parsed.data.currency !== undefined && { currency: parsed.data.currency }),
        ...(parsed.data.isHidden !== undefined && { isHidden: parsed.data.isHidden }),
      },
      include: { images: { orderBy: { order: "asc" } } },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

/** DELETE /api/shops/[id]/products/[productId] — delete a product */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId, productId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const product = await prisma.shopProduct.findUnique({
      where: { id: productId },
      select: { id: true, shopId: true },
    });
    if (!product || product.shopId !== shopId) return err("Product not found", 404);

    await prisma.shopProduct.delete({ where: { id: productId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
