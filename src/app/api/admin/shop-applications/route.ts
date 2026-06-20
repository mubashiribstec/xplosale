import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const applications = await prisma.shopApplication.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true, verificationStatus: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return ok(applications);
  } catch (e) {
    return parseError(e);
  }
}
