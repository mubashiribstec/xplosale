import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getEffectivePlan } from "@/verticals/shops/tier";

interface Params {
  params: Promise<{ id: string }>;
}

const schema = z.object({
  kind: z.enum(["PRODUCT_CLICK", "CONTACT_CLICK", "WEBSITE_CLICK"]),
  productId: z.string().cuid().optional(),
});

/** POST /api/shops/[id]/track — anonymous engagement beacon (premium shops only). */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "anon";
    try {
      const rl = await rateLimit(`shop-track:${ip}`, 60, 60);
      if (!rl.allowed) return ok({ tracked: false });
    } catch {
      // Redis outage — tracking is best-effort, let it through
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid payload", 422);
    const { kind, productId } = parsed.data;

    const shop = await prisma.shop.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!shop || shop.status !== "ACTIVE") return ok({ tracked: false });

    const plan = await getEffectivePlan(id);
    if (!plan.analytics) return ok({ tracked: false });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.shopAnalyticsEvent.findFirst({
        where: { shopId: id, kind, productId: productId ?? null, day: today },
        select: { id: true },
      });
      if (existing) {
        await tx.shopAnalyticsEvent.update({ where: { id: existing.id }, data: { count: { increment: 1 } } });
      } else {
        await tx.shopAnalyticsEvent.create({ data: { shopId: id, kind, productId: productId ?? null, day: today, count: 1 } });
      }
    });

    return ok({ tracked: true });
  } catch {
    // Never surface tracking failures to visitors
    return ok({ tracked: false });
  }
}
