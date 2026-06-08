import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const isAdmin = session && (session.user as { role: string }).role === "ADMIN";
    if (!isAdmin) return err("Forbidden", 403);

    const { searchParams } = req.nextUrl;
    const resolvedParam = searchParams.get("resolved");
    const resolved = resolvedParam === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const where = { resolved };

    const [reports, total, unresolvedCount] = await Promise.all([
      prisma.listingReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: { select: { id: true, title: true, status: true } },
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.listingReport.count({ where }),
      prisma.listingReport.count({ where: { resolved: false } }),
    ]);

    return ok({ reports, total, page, pages: Math.ceil(total / limit), unresolvedCount });
  } catch (e) {
    return parseError(e);
  }
}
