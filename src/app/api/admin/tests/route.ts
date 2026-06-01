import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const search = req.nextUrl.searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { company: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {};

    const [total, templates] = await Promise.all([
      prisma.testTemplate.count({ where }),
      prisma.testTemplate.findMany({
        where,
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          _count: { select: { assignments: true, questions: true } },
        },
      }),
    ]);

    return ok({
      templates,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (e) {
    return parseError(e);
  }
}
