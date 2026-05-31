import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as unknown as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId") ?? "";
    const targetType = searchParams.get("targetType") ?? "";
    const action = searchParams.get("action") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 50;

    const where = {
      ...(adminId ? { adminId } : {}),
      ...(targetType ? { targetType } : {}),
      ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
    };

    const [total, logs] = await Promise.all([
      prisma.adminActionLog.count({ where }),
      prisma.adminActionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { admin: { select: { id: true, name: true } } },
      }),
    ]);

    return ok({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}
