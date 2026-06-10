import { type NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 500;

const schema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  linkUrl: z.string().url().optional().or(z.literal("")),
  targetRole: z.enum(["ALL", "USER", "PARTNER", "ADMIN"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { title, body, linkUrl, targetRole } = parsed.data;
    const payload: Record<string, unknown> = { title, body };
    if (linkUrl) payload.linkUrl = linkUrl;

    const where = {
      bannedAt: null,
      ...(targetRole !== "ALL" ? { role: targetRole } : {}),
    };

    let cursor: string | undefined;
    let total = 0;

    for (;;) {
      const users = await prisma.user.findMany({
        where,
        select: { id: true },
        take: BATCH_SIZE,
        orderBy: { id: "asc" },
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (users.length === 0) break;

      await prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          kind: "ADMIN_BROADCAST" as const,
          payload: payload as Prisma.InputJsonValue,
        })),
      });

      total += users.length;
      cursor = users[users.length - 1].id;
      if (users.length < BATCH_SIZE) break;
    }

    await prisma.adminActionLog.create({
      data: {
        adminId,
        action: "BULK_NOTIFICATION_SENT",
        targetType: "User",
        targetId: targetRole,
        reason: `"${title}" sent to ${total} user(s) (target: ${targetRole})`,
      },
    });

    return ok({ sent: total });
  } catch (e) {
    return parseError(e);
  }
}
