import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  role: z.enum(["USER", "EMPLOYER", "ADMIN"]).optional(),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as unknown as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const adminId = getUserId(session);
    const { userId } = await params;
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);
    const body = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return err("User not found", 404);

    const data: { role?: "USER" | "EMPLOYER" | "ADMIN"; verificationStatus?: "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" } = {};
    if (body.role !== undefined) data.role = body.role;
    if (body.verificationStatus !== undefined) data.verificationStatus = body.verificationStatus;

    const [updated] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "update_user",
          targetType: "user",
          targetId: userId,
          reason: body.reason,
        },
      }),
    ]);

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
