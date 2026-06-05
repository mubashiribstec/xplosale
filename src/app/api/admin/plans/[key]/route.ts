import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  maxShops: z.number().int().min(1).max(100).optional(),
  maxProducts: z.number().int().min(1).max(500).optional(),
  maxImagesPerProduct: z.number().int().min(1).max(20).optional(),
  priceMonthly: z.number().min(0).optional(),
  featuredPlacement: z.boolean().optional(),
  analytics: z.boolean().optional(),
  customBanner: z.boolean().optional(),
});

type Params = { params: Promise<{ key: string }> };

/** PATCH /api/admin/plans/[key] — update plan limits (admin only) */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { key } = await params;
    if (key !== "FREE" && key !== "PREMIUM") return err("Unknown plan key", 404);

    const body = await req.json() as unknown;
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const plan = await prisma.plan.update({
      where: { key: key as "FREE" | "PREMIUM" },
      data: parsed.data,
    });

    return ok(plan);
  } catch (e) {
    return parseError(e);
  }
}
