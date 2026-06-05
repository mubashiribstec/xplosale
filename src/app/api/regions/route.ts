import { type NextRequest } from "next/server";
import { ok, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/regions
 * Without params: returns all regions (existing behaviour).
 * ?cascade=countries — returns distinct countries.
 * ?cascade=cities&country=PK — returns distinct cities for that country.
 * ?cascade=areas&country=PK&city=Lahore — returns area regions for country+city.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const cascade = searchParams.get("cascade");
    const country = searchParams.get("country") ?? undefined;
    const city = searchParams.get("city") ?? undefined;

    if (cascade === "countries") {
      const rows = await prisma.region.findMany({
        select: { country: true },
        distinct: ["country"],
        orderBy: { country: "asc" },
      });
      return ok(rows.map((r) => r.country));
    }

    if (cascade === "cities" && country) {
      const rows = await prisma.region.findMany({
        where: { country },
        select: { city: true },
        distinct: ["city"],
        orderBy: { city: "asc" },
      });
      return ok(rows.map((r) => r.city));
    }

    if (cascade === "areas" && country && city) {
      const rows = await prisma.region.findMany({
        where: { country, city },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      });
      return ok(rows);
    }

    // Default: all regions
    const regions = await prisma.region.findMany({
      select: { id: true, name: true, slug: true, city: true, country: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });
    return ok(regions);
  } catch (e) {
    return parseError(e);
  }
}
