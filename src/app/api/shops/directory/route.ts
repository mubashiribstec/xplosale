import { type NextRequest } from "next/server";
import { ok, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

/**
 * GET /api/shops/directory — public shop listing with filters.
 * No authentication required.
 * Query params: q, category, regionId, city, country, page
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const category = searchParams.get("category") ?? "";
    const regionId = searchParams.get("regionId") ?? "";
    const city = searchParams.get("city") ?? "";
    const country = searchParams.get("country") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

    const regionFilter = regionId
      ? { regionId }
      : city && country
        ? { region: { city, country } }
        : country
          ? { region: { country } }
          : {};

    const where = {
      status: "ACTIVE" as const,
      ...(category ? { category } : {}),
      ...regionFilter,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        include: {
          region: { select: { name: true, city: true, country: true } },
          images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
          subscription: { select: { planKey: true, status: true } },
          _count: { select: { products: { where: { isHidden: false } } } },
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }),
      prisma.shop.count({ where }),
    ]);

    return ok({ shops, total, page, pages: Math.ceil(total / PAGE_SIZE) || 1 });
  } catch (e) {
    return parseError(e);
  }
}
