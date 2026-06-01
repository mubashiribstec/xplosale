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

    // Must be an accepted connection of the target to endorse them.
    const connection = await prisma.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requesterId: userId, recipientId: targetProfile.userId },
          { requesterId: targetProfile.userId, recipientId: userId },
        ],
      },
      select: { id: true },
    });
    if (!connection) return err("You can only endorse your connections", 403);

    // The skill must actually be listed on the target's profile.
    const targetSkill = await prisma.profileSkill.findUnique({
      where: { profileId_skillId: { profileId: targetProfile.id, skillId: parsed.data.skillId } },
      select: { id: true },
    });
    if (!targetSkill) return err("That skill is not on this profile", 422);

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
