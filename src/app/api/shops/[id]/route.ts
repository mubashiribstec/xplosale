import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { isValidCategory, isValidType } from "@/lib/shop-categories";

const updateSchema = z.object({
  // Structural fields — only for DRAFT / REJECTED shops
  name: z.string().min(2).max(100).optional(),
  category: z.string().min(1).max(60).optional(),
  type: z.string().min(1).max(60).optional(),
  description: z.string().min(10).max(2000).optional(),
  addressLine: z.string().min(5).max(300).optional(),
  regionId: z.string().cuid().optional(),
  website: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u) && !/^javascript:/i.test(u), "Invalid URL")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contactPhone: z.string().max(20).optional(),
  // Payment / delivery fields — allowed for any status (ACTIVE shops can update these)
  bankName: z.string().max(100).nullable().optional(),
  bankAccountTitle: z.string().max(100).nullable().optional(),
  bankAccountNumber: z.string().max(50).nullable().optional(),
  jazzcashNumber: z.string().max(30).nullable().optional(),
  easipaisaNumber: z.string().max(30).nullable().optional(),
  acceptsCash: z.boolean().optional(),
  acceptsDelivery: z.boolean().optional(),
  deliveryNotes: z.string().max(500).nullable().optional(),
  workingHours: z.record(z.string(), z.string()).nullable().optional(),
});

const STRUCTURAL_FIELDS = ["name", "category", "type", "description", "addressLine", "regionId", "website", "contactPhone"] as const;

type Params = { params: Promise<{ id: string }> };

/** GET /api/shops/[id] — get a shop (owner or admin) */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as { role?: string }).role === "ADMIN";

    const { id } = await params;
    const shop = await prisma.shop.findUnique({
      where: { id },
      include: {
        region: { select: { name: true, city: true, country: true } },
        images: { orderBy: { order: "asc" } },
        subscription: { select: { planKey: true, status: true, currentPeriodEnd: true } },
        _count: { select: { products: true } },
      },
    });

    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId && !isAdmin) return err("Forbidden", 403);

    return ok(shop);
  } catch (e) {
    return parseError(e);
  }
}

/** PATCH /api/shops/[id] — update a shop (owner only) */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;
    const shop = await prisma.shop.findUnique({ where: { id }, select: { id: true, ownerUserId: true, status: true } });
    if (!shop) return err("Shop not found", 404);
    if (shop.ownerUserId !== userId) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const hasStructural = STRUCTURAL_FIELDS.some((f) => parsed.data[f] !== undefined);
    if (hasStructural && shop.status !== "DRAFT" && shop.status !== "REJECTED") {
      return err("Only DRAFT or REJECTED shops can have their details edited.", 422);
    }

    const {
      regionId, website,
      bankName, bankAccountTitle, bankAccountNumber, jazzcashNumber, easipaisaNumber,
      acceptsCash, acceptsDelivery, deliveryNotes, workingHours,
      ...structural
    } = parsed.data;

    const { category, type } = structural;
    if (category && !isValidCategory(category)) return err("Invalid category", 422);
    if (type && category && !isValidType(category, type)) return err("Invalid type for this category", 422);

    if (regionId) {
      const region = await prisma.region.findUnique({ where: { id: regionId }, select: { id: true } });
      if (!region) return err("Region not found", 404);
    }

    const paymentData = {
      ...(bankName !== undefined ? { bankName } : {}),
      ...(bankAccountTitle !== undefined ? { bankAccountTitle } : {}),
      ...(bankAccountNumber !== undefined ? { bankAccountNumber } : {}),
      ...(jazzcashNumber !== undefined ? { jazzcashNumber } : {}),
      ...(easipaisaNumber !== undefined ? { easipaisaNumber } : {}),
      ...(acceptsCash !== undefined ? { acceptsCash } : {}),
      ...(acceptsDelivery !== undefined ? { acceptsDelivery } : {}),
      ...(deliveryNotes !== undefined ? { deliveryNotes } : {}),
      ...(workingHours !== undefined ? { workingHours } : {}),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      ...structural,
      website: website ?? undefined,
      ...(hasStructural ? { status: "DRAFT" } : {}),
      ...paymentData,
    };
    if (regionId) data.regionId = regionId;

    const updated = await prisma.shop.update({
      where: { id },
      data,
      include: {
        region: { select: { name: true, city: true, country: true } },
      },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
