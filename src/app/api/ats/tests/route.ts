import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  companyId: z.string().cuid(),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  kind: z.enum(["MCQ", "CODING", "FREE_TEXT", "VIDEO", "FILE_UPLOAD", "MIXED"]).default("MCQ"),
  durationMin: z.number().int().min(1).max(300),
  passingScorePercent: z.number().int().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const companyId = req.nextUrl.searchParams.get("companyId");
    if (!companyId) return err("companyId required", 400);

    // Check permission: must be company owner or ADMIN or hiring team member
    if (userRole !== "ADMIN") {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { ownerId: true },
      });
      if (!company) return err("Company not found", 404);

      if (company.ownerId !== userId) {
        const isTeamMember = await prisma.hiringTeam.findFirst({
          where: { userId, jobPosting: { companyId } },
        });
        if (!isTeamMember) return err("Forbidden", 403);
      }
    }

    const templates = await prisma.testTemplate.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, assignments: true } },
      },
    });

    return ok(templates);
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

    const { companyId, name, description, kind, durationMin, passingScorePercent } = parsed.data;

    // Permission: must be company owner or ADMIN
    if (userRole !== "ADMIN") {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { ownerId: true },
      });
      if (!company) return err("Company not found", 404);
      if (company.ownerId !== userId) return err("Forbidden", 403);
    }

    const template = await prisma.testTemplate.create({
      data: {
        companyId,
        name,
        description,
        kind,
        durationMin,
        passingScorePercent,
      },
    });

    return ok(template, 201);
  } catch (e) {
    return parseError(e);
  }
}
