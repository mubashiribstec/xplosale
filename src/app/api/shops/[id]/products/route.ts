import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getEffectivePlan } from "@/verticals/shops/tier";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  priceMin: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  currency: z.string().length(3).default("PKR"),
  inStock: z.boolean().optional(),
  stockCount: z.number().int().min(0).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** GET /api/shops/[id]/products — list all products for a shop (owner only) */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const products = await prisma.shopProduct.findMany({
      where: { shopId },
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { order: "asc" },
      take: 100,
    });

    return ok(products);
  } catch (e) {
    return parseError(e);
  }
}

/** POST /api/shops/[id]/products — create a product (tier-limited) */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id: shopId } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerUserId: true },
    });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const [plan, productCount] = await Promise.all([
      getEffectivePlan(shopId),
      prisma.shopProduct.count({ where: { shopId } }),
    ]);

    if (productCount >= plan.maxProducts) {
      return err(
        plan.key === "FREE"
          ? `Free shops can list up to ${plan.maxProducts} products. Upgrade to Premium for more.`
          : `Your plan allows a maximum of ${plan.maxProducts} products.`,
        402,
        { limit: plan.maxProducts, current: productCount, planKey: plan.key }
      );
    }

    const { name, description, priceMin, priceMax, currency, inStock, stockCount } = parsed.data;

    const product = await prisma.shopProduct.create({
      data: {
        shopId,
        name,
        description: description ?? null,
        priceMin: priceMin != null ? priceMin : null,
        priceMax: priceMax != null ? priceMax : null,
        currency,
        order: productCount,
        ...(inStock !== undefined ? { inStock } : {}),
        ...(stockCount !== undefined ? { stockCount } : {}),
      },
      include: { images: true },
    });

    return ok(product, 201);
  } catch (e) {
    return parseError(e);
  }
}
