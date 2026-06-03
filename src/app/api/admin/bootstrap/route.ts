import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    // Only works when no admin exists yet
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) return err("An admin account already exists", 409);

    await prisma.user.update({
      where: { id: userId },
      data: { role: "ADMIN" },
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
