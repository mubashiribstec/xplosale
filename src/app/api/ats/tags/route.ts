import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePipelineStages } from "@/verticals/jobs/ats/permissions";

const createSchema = z.object({
  companyId: z.string(),
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6B7280"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) return err("companyId required", 400);

    const allowed = await canManagePipelineStages(userId, companyId, userRole);
    if (!allowed) {
      const isTeamMember = await prisma.hiringTeam.findFirst({
        where: { userId, jobPosting: { companyId } },
      });
      if (!isTeamMember) return err("Forbidden", 403);
    }

    const tags = await prisma.candidateTag.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      take: 200,
    });
    return ok(tags);
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const allowed = await canManagePipelineStages(userId, parsed.data.companyId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const tag = await prisma.candidateTag.create({
      data: { companyId: parsed.data.companyId, name: parsed.data.name, color: parsed.data.color },
    });
    return ok(tag, 201);
  } catch (e) {
    return parseError(e);
  }
}
