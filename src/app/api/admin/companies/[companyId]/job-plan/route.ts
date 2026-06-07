import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  planKey: z.enum(["FREE", "MONTHLY"]),
  postLimit: z.number().int().min(1).max(100).optional(),
  addCredits: z.number().int().min(0).max(50).optional(),
  expiresAt: z.string().datetime().optional(),
});

type Params = { params: Promise<{ companyId: string }> };

/** PATCH /api/admin/companies/[companyId]/job-plan — upgrade or downgrade job plan */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role?: string }).role !== "ADMIN") return err("Forbidden", 403);
    const adminId = getUserId(session);

    const { companyId } = await params;
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, jobPostCredits: true } });
    if (!company) return err("Company not found", 404);

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const defaultLimit = parsed.data.planKey === "MONTHLY" ? 10 : 3;
    const data: Record<string, unknown> = {
      jobPlanKey: parsed.data.planKey,
      jobPostLimit: parsed.data.postLimit ?? defaultLimit,
    };
    if (parsed.data.expiresAt) data.jobPlanExpiresAt = new Date(parsed.data.expiresAt);
    if (parsed.data.addCredits) data.jobPostCredits = { increment: parsed.data.addCredits };

    const [updated] = await prisma.$transaction([
      prisma.company.update({ where: { id: companyId }, data }),
      prisma.adminActionLog.create({
        data: {
          adminId,
          action: "COMPANY_JOB_PLAN_UPGRADED",
          targetType: "Company",
          targetId: companyId,
          reason: `Plan: ${parsed.data.planKey}, limit: ${data.jobPostLimit}, credits+: ${parsed.data.addCredits ?? 0}`,
        },
      }),
    ]);

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
