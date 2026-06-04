import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const ACCOUNT_TYPE = z.enum(["SELLER", "JOB_SEEKER", "EMPLOYER", "NETWORKER"]);

const setupSchema = z.object({
  name: z.string().min(2).max(80),
  accountTypes: z.array(ACCOUNT_TYPE).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { name, accountTypes } = parsed.data;

    // Employer takes the highest role; everyone else is USER.
    const role = accountTypes.includes("EMPLOYER") ? "EMPLOYER_HIRING_MANAGER" : "USER";

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name, role },
      });

      // Create profile stubs for each selected type.
      // Prisma 7 requires the relation object in create — passing only the scalar FK is no longer valid.
      if (accountTypes.includes("SELLER")) {
        await tx.sellerProfile.upsert({
          where:  { userId },
          update: {},
          create: { user: { connect: { id: userId } } },
        });
      }

      if (accountTypes.includes("JOB_SEEKER")) {
        await tx.jobSeekerProfile.upsert({
          where:  { userId },
          update: {},
          create: { user: { connect: { id: userId } } },
        });
      }

      // EMPLOYER: EmployerProfile requires a companyId that doesn't exist at setup time.
      // Role is set above; the profile is created when the user creates their first company.

      // Always create a NetworkProfile so the user is discoverable.
      const handle = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30);
      const uniqueHandle = `${handle}-${userId.slice(-6)}`;
      await tx.networkProfile.upsert({
        where:  { userId },
        update: {},
        create: { user: { connect: { id: userId } }, handle: uniqueHandle },
      });
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
