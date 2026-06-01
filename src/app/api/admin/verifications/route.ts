import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const pending = await prisma.user.findMany({
      where: { verificationStatus: "PENDING" },
      select: { id: true, name: true, phone: true, email: true, createdAt: true, verificationStatus: true, docType: true },
      orderBy: { createdAt: "asc" },
    });

    return ok(pending);
  } catch (e) {
    return parseError(e);
  }
}
