/**
 * GET /api/admin/audit/export
 * ADMIN only. Streams the (filtered) audit log as a CSV download.
 */

import { type NextRequest, NextResponse } from "next/server";
import { err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const MAX_ROWS = 10000;

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { searchParams } = req.nextUrl;
    const adminId = searchParams.get("adminId") ?? "";
    const targetType = searchParams.get("targetType") ?? "";
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";

    const where: { adminId?: string; targetType?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    if (adminId) where.adminId = adminId;
    if (targetType) where.targetType = targetType;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
    }

    const logs = await prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: { admin: { select: { name: true } } },
    });

    const header = ["Time", "Admin", "Action", "Target Type", "Target ID", "Reason"];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.admin.name ?? "",
      log.action,
      log.targetType,
      log.targetId,
      log.reason ?? "",
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n") + "\r\n";

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${Date.now()}.csv"`,
      },
    });
  } catch (e) {
    return parseError(e);
  }
}
