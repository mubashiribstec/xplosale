import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  role: z.enum(["USER", "PARTNER", "ADMIN"]).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
  hasVerifiedBadge: z.boolean().optional(),
  ban: z.boolean().optional(),
  forceLogout: z.boolean().optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as unknown as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const { userId } = await params;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);
    const body = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err("User not found", 404);

    // Guard against self-lockout
    if (body.role !== undefined && body.role !== "ADMIN" && user.role === "ADMIN") {
      if (userId === adminId) return err("You cannot remove your own admin role", 409);
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", id: { not: userId } } });
      if (otherAdmins === 0) return err("Cannot demote the last remaining admin", 409);
    }

    const data: Record<string, unknown> = {};
    if (body.role !== undefined) data.role = body.role;
    if (body.verificationStatus !== undefined) data.verificationStatus = body.verificationStatus;
    if (body.hasVerifiedBadge !== undefined) data.hasVerifiedBadge = body.hasVerifiedBadge;
    if (body.ban !== undefined) data.bannedAt = body.ban ? new Date() : null;
    if (body.forceLogout) data.tokenVersion = { increment: 1 };

    const actions: string[] = [];
    if (body.ban !== undefined) actions.push(body.ban ? "BAN_USER" : "UNBAN_USER");
    if (body.forceLogout) actions.push("FORCE_LOGOUT");
    if (body.role !== undefined) actions.push("CHANGE_ROLE");
    if (body.hasVerifiedBadge !== undefined) actions.push(body.hasVerifiedBadge ? "GRANT_BADGE" : "REVOKE_BADGE");

    const action = actions.join("+") || "UPDATE_USER";

    const [updated] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action,
          targetType: "User",
          targetId: userId,
          reason: body.reason ?? action,
        },
      }),
    ]);

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
