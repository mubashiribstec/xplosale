import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { inviteId } = await params;

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action } = parsed.data;

    const invite = await prisma.inviteToApply.findUnique({ where: { id: inviteId } });
    if (!invite) return err("Invite not found", 404);
    if (invite.candidateUserId !== userId) return err("Forbidden", 403);
    if (invite.status !== "PENDING") return err("Invite is no longer pending", 409);
    if (invite.expiresAt <= new Date()) return err("Invite has expired", 410);

    const updated = await prisma.inviteToApply.update({
      where: { id: inviteId },
      data: {
        status: action === "accept" ? "ACCEPTED" : "DECLINED",
        respondedAt: new Date(),
      },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
