import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const { userId } = await params;

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action, reason } = parsed.data;

    const application = await prisma.partnerApplication.findUnique({
      where: { userId },
    });
    if (!application) return err("Partner application not found", 404);
    if (application.status !== "PENDING") return err("Application is not pending", 400);

    if (action === "approve") {
      await prisma.$transaction([
        prisma.partnerApplication.update({
          where: { userId },
          data: { status: "APPROVED", reviewedAt: new Date(), reviewedById: adminId, reason },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { isPartner: true, partnerType: application.partnerType },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "PARTNER_APPROVED",
            targetType: "User",
            targetId: userId,
            reason: reason ?? "Partner application approved",
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.partnerApplication.update({
          where: { userId },
          data: { status: "REJECTED", reviewedAt: new Date(), reviewedById: adminId, reason },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "PARTNER_REJECTED",
            targetType: "User",
            targetId: userId,
            reason: reason ?? "Partner application rejected",
          },
        }),
      ]);
    }

    return ok({ message: action === "approve" ? "Partner approved" : "Application rejected" });
  } catch (e) {
    return parseError(e);
  }
}
