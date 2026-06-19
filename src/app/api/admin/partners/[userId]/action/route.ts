import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["suspend", "reinstate", "downgrade"]),
  reason: z.string().max(1000).optional(),
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
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action, reason } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err("User not found", 404);

    const employerProfile = await prisma.employerProfile.findUnique({ where: { userId }, select: { companyId: true } });
    const setVerifiedEmployer = (verified: boolean) =>
      employerProfile
        ? [prisma.company.update({ where: { id: employerProfile.companyId }, data: { verifiedEmployer: verified } })]
        : [];

    if (action === "suspend") {
      if (user.role !== "PARTNER") return err("User is not an active partner", 400);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { role: "USER", partnerSuspendedAt: new Date(), tokenVersion: { increment: 1 } },
        }),
        ...setVerifiedEmployer(false),
        prisma.adminActionLog.create({
          data: { adminId, action: "PARTNER_SUSPENDED", targetType: "User", targetId: userId, reason },
        }),
      ]);
      return ok({ message: "Partner suspended" });
    }

    if (action === "reinstate") {
      if (!user.partnerSuspendedAt) return err("User is not suspended", 400);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { role: "PARTNER", partnerSuspendedAt: null },
        }),
        ...setVerifiedEmployer(true),
        prisma.adminActionLog.create({
          data: { adminId, action: "PARTNER_REINSTATED", targetType: "User", targetId: userId, reason },
        }),
      ]);
      return ok({ message: "Partner reinstated" });
    }

    // downgrade
    if (!user.isPartner && user.role !== "PARTNER") return err("User is not a partner", 400);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          role: "USER",
          isPartner: false,
          partnerType: null,
          partnerSuspendedAt: null,
          tokenVersion: { increment: 1 },
        },
      }),
      ...setVerifiedEmployer(false),
      prisma.adminActionLog.create({
        data: { adminId, action: "PARTNER_DOWNGRADED", targetType: "User", targetId: userId, reason },
      }),
    ]);
    return ok({ message: "Partner downgraded" });
  } catch (e) {
    return parseError(e);
  }
}
