import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getOrCreateRoom } from "@/core/messaging/rooms";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const limited = await rateLimit(`support:room:${userId}`, 5, 3600);
    if (!limited.allowed) return err("Too many requests", 429);

    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) return err("Support unavailable", 503);

    if (userId === admin.id) return err("Admins cannot open support tickets with themselves", 400);

    const [pA, pB] = [userId, admin.id].sort();
    const room = await getOrCreateRoom("ADMIN_DM", userId, pA, pB);
    return ok({ roomId: room.id });
  } catch (e) {
    return parseError(e);
  }
}
