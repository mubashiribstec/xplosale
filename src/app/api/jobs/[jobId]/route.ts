import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { recomputeMatchesForJob } from "@/verticals/jobs/ats/recompute-match";

const skillsArray = z.array(z.string().max(60)).max(30).optional();

const patchSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(10000).optional(),
  remoteType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"]).optional(),
  experienceLevel: z.enum(["ENTRY", "MID", "SENIOR", "LEAD"]).optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  regionId: z.string().cuid().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED", "EXPIRED"]).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  postCode: z.string().max(20).optional(),
  companyAddress: z.string().max(300).optional(),
  requiredSkills: skillsArray,
  niceToHaveSkills: skillsArray,
  requiredKeywords: skillsArray,
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        company: true,
        region: true,
        _count: { select: { applications: true } },
      },
    });

    if (!job) return err("Job not found", 404);

    return ok(job);
  } catch (e) {
    return parseError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as unknown as { role: string }).role === "ADMIN";

    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return err("Job not found", 404);
    if (job.postedByUserId !== userId && !isAdmin) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { status, ...rest } = parsed.data;

    if (status && !isAdmin) {
      if (!(job.status === "DRAFT" && status === "ACTIVE")) {
        return err("Invalid status transition", 422);
      }
    }

    const { requiredSkills, niceToHaveSkills, requiredKeywords, ...restFields } = rest;
    const skillsChanged = requiredSkills !== undefined || niceToHaveSkills !== undefined || requiredKeywords !== undefined;

    const updated = await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        ...restFields,
        ...(status !== undefined ? { status } : {}),
        ...(requiredSkills !== undefined ? { requiredSkills } : {}),
        ...(niceToHaveSkills !== undefined ? { niceToHaveSkills } : {}),
        ...(requiredKeywords !== undefined ? { requiredKeywords } : {}),
      },
    });

    // Recompute match scores when skills/keywords change (fire-and-forget)
    if (skillsChanged) {
      recomputeMatchesForJob(jobId).catch((e: unknown) =>
        console.error("[match] Recompute failed:", e)
      );
    }

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const isAdmin = (session.user as unknown as { role: string }).role === "ADMIN";

    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
    if (!job) return err("Job not found", 404);
    if (job.postedByUserId !== userId && !isAdmin) return err("Forbidden", 403);

    await prisma.jobPosting.delete({ where: { id: jobId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
