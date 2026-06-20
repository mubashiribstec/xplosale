import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const ACCOUNT_TYPE = z.enum(["SELLER", "JOB_SEEKER", "PARTNER"]);

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

    // SECURITY: the PARTNER role is a privileged tier and must NEVER be granted
    // from self-service signup input. Selecting "business" here only records the
    // intent (a profile stub); elevation to PARTNER happens solely via the
    // partner-application flow after admin approval
    // (see /api/admin/partners/[userId]). Account setup only ever sets USER.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name, role: "USER" },
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

      // PARTNER: EmployerProfile requires a companyId that doesn't exist at setup time.
      // Role is set above; the profile is created when the user creates their first company.
    });

    return ok({ ok: true });
  } catch (e) {
    return parseError(e);
  }
}
