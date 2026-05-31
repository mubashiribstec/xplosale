import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { hashCnic } from "@/core/auth/otp";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
  cnicNumber: z.string().optional(), // required for approve
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { userId } = await params;
    const adminId = (session.user as { id: string }).id;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action, reason, cnicNumber } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err("User not found", 404);
    if (user.verificationStatus !== "PENDING") return err("User is not pending verification", 400);

    if (action === "approve") {
      if (!cnicNumber) return err("cnicNumber is required for approval", 422);
      const cnHash = hashCnic(cnicNumber);

      // Check for duplicate CNIC
      const existing = await prisma.user.findUnique({ where: { cnHash } });
      if (existing && existing.id !== userId) {
        return err("This CNIC is already registered to another account", 409);
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { verificationStatus: "VERIFIED", cnHash },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "CNIC_APPROVED",
            targetType: "User",
            targetId: userId,
            reason: reason ?? "Documents verified",
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { verificationStatus: "REJECTED" },
        }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: "CNIC_REJECTED",
            targetType: "User",
            targetId: userId,
            reason: reason ?? "Documents rejected",
          },
        }),
      ]);
    }

    return ok({ message: action === "approve" ? "User verified" : "Verification rejected" });
  } catch (e) {
    return parseError(e);
  }
}
