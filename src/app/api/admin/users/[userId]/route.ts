import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { kvSet, kvDel } from "@/core/adapters/kv";

// 30-day TTL for the Redis ban key — generous margin above any JWT maxAge
const BAN_KEY_TTL = 30 * 24 * 60 * 60;

const bodySchema = z.object({
  role: z.enum(["USER", "PARTNER", "ADMIN"]).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
  hasVerifiedBadge: z.boolean().optional(),
  canCreateShop: z.boolean().optional(),
  ban: z.boolean().optional(),
  bannedUntil: z.string().datetime().optional(),
  bannedSections: z.array(z.string()).optional(),
  bannedMarketplaceCategories: z.array(z.string()).optional(),
  bannedJobCategories: z.array(z.string()).optional(),
  forceLogout: z.boolean().optional(),
  reason: z.string().max(1000).optional(),
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

    // The Super Admin can never be demoted or banned
    if (user.isSuperAdmin) {
      if (body.role !== undefined && body.role !== "ADMIN") return err("Cannot change the Super Admin's role", 409);
      if (body.ban === true) return err("Cannot ban the Super Admin", 409);
    }

    const data: Record<string, unknown> = {};
    if (body.role !== undefined) {
      data.role = body.role;
      // Admins are automatically fully verified — no document submission needed
      if (body.role === "ADMIN") {
        data.verificationStatus = "VERIFIED";
        data.hasVerifiedBadge = true;
      }
    }
    if (body.verificationStatus !== undefined) data.verificationStatus = body.verificationStatus;
    if (body.hasVerifiedBadge !== undefined) data.hasVerifiedBadge = body.hasVerifiedBadge;
    if (body.canCreateShop !== undefined) {
      data.canCreateShop = body.canCreateShop;
      data.hasShopkeeperBadge = body.canCreateShop;
    }
    if (body.ban !== undefined) {
      data.bannedAt = body.ban ? new Date() : null;
      if (!body.ban) {
        data.banReason = null;
        data.bannedUntil = null;
        data.bannedSections = [];
        data.bannedMarketplaceCategories = [];
        data.bannedJobCategories = [];
      }
    }
    if (body.ban && body.bannedUntil) data.bannedUntil = new Date(body.bannedUntil);
    if (body.ban && body.reason) data.banReason = body.reason;
    if (body.bannedSections !== undefined) data.bannedSections = body.bannedSections;
    if (body.bannedMarketplaceCategories !== undefined) data.bannedMarketplaceCategories = body.bannedMarketplaceCategories;
    if (body.bannedJobCategories !== undefined) data.bannedJobCategories = body.bannedJobCategories;
    if (body.forceLogout) data.tokenVersion = { increment: 1 };

    const actions: string[] = [];
    if (body.ban !== undefined) actions.push(body.ban ? "BAN_USER" : "UNBAN_USER");
    if (body.forceLogout) actions.push("FORCE_LOGOUT");
    if (body.role !== undefined) actions.push("CHANGE_ROLE");
    if (body.hasVerifiedBadge !== undefined) actions.push(body.hasVerifiedBadge ? "GRANT_BADGE" : "REVOKE_BADGE");
    if (body.canCreateShop !== undefined) actions.push(body.canCreateShop ? "GRANT_SHOPKEEPER" : "REVOKE_SHOPKEEPER");

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

    // Sync Redis ban key for instant middleware enforcement
    if (body.ban !== undefined) {
      if (body.ban) {
        await kvSet(`banned:${userId}`, "1", BAN_KEY_TTL);
      } else {
        await kvDel(`banned:${userId}`);
      }
    }

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

/** DELETE /api/admin/users/[userId] — permanently delete a user and their data */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as unknown as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const { userId } = await params;

    if (userId === adminId) return err("You cannot delete your own account", 409);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, isSuperAdmin: true } });
    if (!user) return err("User not found", 404);

    if (user.isSuperAdmin) return err("Cannot delete the Super Admin", 409);

    if (user.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", id: { not: userId } } });
      if (otherAdmins === 0) return err("Cannot delete the last remaining admin", 409);
    }

    await prisma.$transaction([
      prisma.user.delete({ where: { id: userId } }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "USER_DELETED",
          targetType: "User",
          targetId: userId,
          reason: `Deleted user: ${user.name ?? user.email ?? userId}`,
        },
      }),
    ]);

    await kvDel(`banned:${userId}`);

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
