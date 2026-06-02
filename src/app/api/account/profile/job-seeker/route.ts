import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { type NextRequest } from "next/server";

const schema = z.object({
  headline: z.string().max(120).optional(),
  summary: z.string().max(2000).optional(),
  currentRoleTitle: z.string().max(100).optional(),
  openToWork: z.boolean().optional(),
  resumeUrl: z.string().url().optional().or(z.literal("")),
  expectedSalaryMin: z.number().int().min(0).optional(),
  expectedSalaryMax: z.number().int().min(0).optional(),
  currency: z.string().max(5).optional(),
  recruiterDiscoverable: z.boolean().optional(),
  preferredRemoteType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional().nullable(),
  preferredRegionIds: z.array(z.string().cuid()).optional(),
  doNotRecommendCompanyIds: z.array(z.string().cuid()).optional(),
});

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { userId: getUserId(session) },
    });
    return ok(profile);
  } catch (e) { return parseError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const data = { ...parsed.data, resumeUrl: parsed.data.resumeUrl || undefined };
    const profile = await prisma.jobSeekerProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, openToWork: true, ...data },
    });
    return ok(profile);
  } catch (e) { return parseError(e); }
}
