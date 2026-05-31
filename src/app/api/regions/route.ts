import { ok, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const regions = await prisma.region.findMany({
      select: { id: true, name: true, slug: true, city: true },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    });
    return ok(regions);
  } catch (e) {
    return parseError(e);
  }
}
