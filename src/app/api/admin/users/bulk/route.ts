import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { kvSet, kvDel } from "@/core/adapters/kv";

// 30-day TTL for the Redis ban key — generous margin above any JWT maxAge
const BAN_KEY_TTL = 30 * 24 * 60 * 60;
const CHUNK_SIZE = 20;

const schema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
  action: z.enum(["ban", "unban"]),
  reason: z.string().max(1000).optional(),
  bannedUntil: z.string().datetime().optional(),
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as unknown as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { userIds, action, reason, bannedUntil } = parsed.data;
    if (action === "ban" && (!reason || reason.trim().length < 1)) {
      return err("Validation error", 422, { reason: ["Reason is required to ban users"] });
    }

    const data: Record<string, unknown> = action === "ban"
      ? {
          bannedAt: new Date(),
          banReason: reason,
          ...(bannedUntil ? { bannedUntil: new Date(bannedUntil) } : {}),
        }
      : {
          bannedAt: null,
          banReason: null,
          bannedUntil: null,
          bannedSections: [],
          bannedMarketplaceCategories: [],
          bannedJobCategories: [],
        };

    let succeeded = 0;
    let failed = 0;

    for (const idGroup of chunk(userIds, CHUNK_SIZE)) {
      const users = await prisma.user.findMany({
        where: { id: { in: idGroup }, role: { not: "ADMIN" } },
        select: { id: true },
      });
      const found = new Set(users.map((u) => u.id));
      failed += idGroup.filter((id) => !found.has(id)).length;
      if (users.length === 0) continue;

      const ops = users.flatMap((user) => [
        prisma.user.update({ where: { id: user.id }, data }),
        prisma.adminActionLog.create({
          data: {
            adminId,
            action: action === "ban" ? "BAN_USER_BULK" : "UNBAN_USER_BULK",
            targetType: "User",
            targetId: user.id,
            reason: action === "ban" ? reason : "Unbanned by admin (bulk)",
          },
        }),
      ]);

      await prisma.$transaction(ops);
      succeeded += users.length;

      for (const user of users) {
        if (action === "ban") {
          await kvSet(`banned:${user.id}`, "1", BAN_KEY_TTL);
        } else {
          await kvDel(`banned:${user.id}`);
        }
      }
    }

    return ok({ succeeded, failed });
  } catch (e) {
    return parseError(e);
  }
}
