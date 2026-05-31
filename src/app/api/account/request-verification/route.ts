import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err("User not found", 404);
    if (user.verificationStatus === "VERIFIED") return err("Already verified", 400);
    if (user.verificationStatus === "PENDING") return ok({ message: "Already pending review" });

    await prisma.user.update({
      where: { id: userId },
      data: { verificationStatus: "PENDING" },
    });

    return ok({ message: "Verification request submitted" });
  } catch (e) {
    return parseError(e);
  }
}
