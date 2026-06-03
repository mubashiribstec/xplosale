import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const setupSchema = z.object({
  name: z.string().min(2).max(80),
  accountType: z.enum(["SELLER", "JOB_SEEKER", "EMPLOYER", "NETWORKER"]),
});

const ROLE_MAP = {
  SELLER: "USER",
  JOB_SEEKER: "JOB_SEEKER",
  EMPLOYER: "EMPLOYER_HIRING_MANAGER",
  NETWORKER: "USER",
} as const;

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { name, accountType } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name, role: ROLE_MAP[accountType] },
      });

      // Create the matching profile stubs so /me doesn't redirect again
      if (accountType === "SELLER") {
        await tx.sellerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
      } else if (accountType === "JOB_SEEKER") {
        await tx.jobSeekerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
      } else if (accountType === "EMPLOYER") {
        await tx.employerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });
      }

      // Always create a NetworkProfile so the user is discoverable
      const handle = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);
      const uniqueHandle = `${handle}-${userId.slice(-6)}`;
      await tx.networkProfile.upsert({
        where: { userId },
        update: {},
        create: { userId, handle: uniqueHandle },
      });
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
