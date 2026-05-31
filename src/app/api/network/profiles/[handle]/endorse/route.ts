import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/core/messaging/rooms";
import { z } from "zod";

const schema = z.object({ skillId: z.string().cuid() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const myProfile = await prisma.networkProfile.findUnique({
      where: { userId },
      select: { id: true, handle: true },
    });
    if (!myProfile) return err("Network profile not found", 404);

    const { handle } = await params;
    const targetProfile = await prisma.networkProfile.findUnique({
      where: { handle },
      select: { id: true, userId: true },
    });
    if (!targetProfile) return err("Profile not found", 404);
    if (targetProfile.userId === userId) return err("Cannot endorse yourself", 422);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    await prisma.endorsement.upsert({
      where: {
        giverProfileId_receiverProfileId_skillId: {
          giverProfileId: myProfile.id,
          receiverProfileId: targetProfile.id,
          skillId: parsed.data.skillId,
        },
      },
      update: {},
      create: {
        giverProfileId: myProfile.id,
        receiverProfileId: targetProfile.id,
        skillId: parsed.data.skillId,
      },
    });

    await createNotification(targetProfile.userId, "ENDORSEMENT", {
      giverHandle: myProfile.handle,
      skillId: parsed.data.skillId,
    });

    return ok({ endorsed: true });
  } catch (e) {
    return parseError(e);
  }
}
