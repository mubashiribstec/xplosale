import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return err("Notification not found", 404);
    if (notification.userId !== userId) return err("Forbidden", 403);

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
