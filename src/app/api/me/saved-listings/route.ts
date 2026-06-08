import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const [savedListings, total] = await Promise.all([
      prisma.savedListing.findMany({
        where: { userId },
        orderBy: { savedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              currency: true,
              status: true,
              createdAt: true,
              images: { take: 1, orderBy: { order: "asc" } },
              region: { select: { name: true, city: true } },
            },
          },
        },
      }),
      prisma.savedListing.count({ where: { userId } }),
    ]);

    return ok({ savedListings, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}
