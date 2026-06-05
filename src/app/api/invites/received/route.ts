import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const now = new Date();

    const invites = await prisma.inviteToApply.findMany({
      where: { candidateUserId: userId },
      orderBy: { sentAt: "desc" },
      take: 100,
      include: {
        jobPosting: {
          select: {
            id: true,
            title: true,
            company: { select: { id: true, name: true } },
          },
        },
        sender: { select: { id: true, name: true } },
      },
    });

    // Bulk-expire PENDING invites that have passed expiresAt
    const toExpire = invites
      .filter((inv) => inv.status === "PENDING" && inv.expiresAt <= now)
      .map((inv) => inv.id);

    if (toExpire.length > 0) {
      await prisma.inviteToApply.updateMany({
        where: { id: { in: toExpire } },
        data: { status: "EXPIRED" },
      });
    }

    const annotated = invites.map((inv) => ({
      ...inv,
      status: inv.status === "PENDING" && inv.expiresAt <= now ? ("EXPIRED" as const) : inv.status,
    }));

    return ok({ invites: annotated });
  } catch (e) {
    return parseError(e);
  }
}
