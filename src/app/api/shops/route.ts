import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getEffectivePlanForUser, countActiveShopsForUser, generateSlug } from "@/verticals/shops/tier";
import { isValidCategory, isValidType } from "@/lib/shop-categories";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(1).max(60),
  type: z.string().min(1).max(60),
  description: z.string().min(10).max(2000),
  addressLine: z.string().min(5).max(300),
  regionId: z.string().cuid(),
  website: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u) && !/^javascript:/i.test(u), "Invalid URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contactPhone: z.string().max(20).optional(),
});

/** GET /api/shops — list the authenticated user's own shops */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const shops = await prisma.shop.findMany({
      where: { ownerUserId: userId },
      include: {
        region: { select: { name: true, city: true, country: true } },
        images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
        subscription: { select: { planKey: true, status: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return ok(shops);
  } catch (e) {
    return parseError(e);
  }
}

/** POST /api/shops — create a shop (FREE tier: max 1 shop) */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { name, category, type, description, addressLine, regionId, website, contactPhone } = parsed.data;

    if (!isValidCategory(category)) return err("Invalid category", 422);
    if (!isValidType(category, type)) return err("Invalid type for this category", 422);

    // Verify region exists
    const region = await prisma.region.findUnique({ where: { id: regionId }, select: { id: true, country: true } });
    if (!region) return err("Region not found", 404);

    // Enforce maxShops tier limit
    const [plan, shopCount] = await Promise.all([
      getEffectivePlanForUser(userId),
      countActiveShopsForUser(userId),
    ]);

    if (shopCount >= plan.maxShops) {
      return err(
        plan.key === "FREE"
          ? "Free accounts can only have 1 shop. Upgrade to Premium for up to 5 shops."
          : `Your plan allows a maximum of ${plan.maxShops} shops.`,
        402,
        { limit: plan.maxShops, current: shopCount, planKey: plan.key }
      );
    }

    // Generate a unique slug
    let slug = generateSlug(name);
    const existing = await prisma.shop.findUnique({ where: { slug }, select: { id: true } });
    if (existing) slug = generateSlug(name); // re-roll with new timestamp if collision

    const shop = await prisma.shop.create({
      data: {
        ownerUserId: userId,
        name,
        slug,
        category,
        type,
        description,
        addressLine,
        regionId,
        countryCode: region.country,
        website: website ?? null,
        contactPhone: contactPhone ?? null,
        status: "DRAFT",
      },
      include: {
        region: { select: { name: true, city: true, country: true } },
      },
    });

    return ok(shop, 201);
  } catch (e) {
    return parseError(e);
  }
}
