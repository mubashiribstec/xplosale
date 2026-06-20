import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/account — permanently delete the signed-in user's account.
 * Related records cascade via the schema's onDelete rules. The Super Admin
 * cannot be deleted. The client should call signOut() after this succeeds.
 */
export async function DELETE() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isSuperAdmin: true },
    });
    if (!user) return err("Account not found", 404);
    if (user.isSuperAdmin) return err("The Super Admin account cannot be deleted.", 409);

    await prisma.user.delete({ where: { id: userId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
