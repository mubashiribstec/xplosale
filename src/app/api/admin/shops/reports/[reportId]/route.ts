/**
 * PATCH /api/admin/shops/reports/[reportId]
 * Admin actions: mark investigating, close with action (suspend shop), close no action.
 */

import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["INVESTIGATING", "CLOSE_ACTION", "CLOSE_NO_ACTION"]),
  reason: z.string().max(500).optional(),
});

type Params = { params: Promise<{ reportId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const adminId = getUserId(session);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { reportId } = await params;
    const report = await prisma.shopReport.findUnique({
      where: { id: reportId },
      select: { id: true, shopId: true, status: true },
    });
    if (!report) return err("Report not found", 404);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Invalid action", 422);

    const { action, reason } = parsed.data;

    if (action === "INVESTIGATING") {
      await prisma.shopReport.update({
        where: { id: reportId },
        data:  { status: "INVESTIGATING" },
      });
      return ok({ status: "INVESTIGATING" });
    }

    if (action === "CLOSE_ACTION") {
      const [, report2] = await prisma.$transaction([
        prisma.shop.update({
          where: { id: report.shopId },
          data:  { status: "SUSPENDED" },
        }),
        prisma.shopReport.update({
          where: { id: reportId },
          data:  { status: "CLOSED_ACTION" },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "SHOP_SUSPENDED",
            targetType: "Shop",
            targetId: report.shopId,
            reason: reason ?? "Suspended via shop report",
          },
        }),
      ]);
      return ok(report2);
    }

    // CLOSE_NO_ACTION
    await prisma.shopReport.update({
      where: { id: reportId },
      data:  { status: "CLOSED_NO_ACTION" },
    });
    return ok({ status: "CLOSED_NO_ACTION" });
  } catch (e) {
    return parseError(e);
  }
}
