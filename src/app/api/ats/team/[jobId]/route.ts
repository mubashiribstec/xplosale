import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePipelineStages } from "@/verticals/jobs/ats/permissions";
import { logAdminAction } from "@/core/audit";

const addMemberSchema = z.object({
  identifier: z.string().min(1),
  role: z.enum(["RECRUITER", "HIRING_MANAGER", "INTERVIEWER", "OBSERVER"]),
});

async function getCompanyIdAndVerifyOwner(userId: string, jobId: string, userRole: string) {
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: { companyId: true, company: { select: { ownerId: true } } },
  });
  if (!job) return null;

  const allowed = await canManagePipelineStages(userId, job.companyId, userRole);
  if (!allowed) return null;

  return job.companyId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const { jobId } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { company: { select: { ownerId: true } } },
    });
    if (!job) return err("Job not found", 404);

    const userRole = (session.user as { role: string }).role;
    const isOwner = job.company.ownerId === userId;
    const isAdmin = userRole === "ADMIN";
    const isTeamMember = await prisma.hiringTeam.findFirst({ where: { jobPostingId: jobId, userId } });

    if (!isOwner && !isAdmin && !isTeamMember) return err("Forbidden", 403);

    const team = await prisma.hiringTeam.findMany({
      where: { jobPostingId: jobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { addedAt: "asc" },
    });

    return ok(team);
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { jobId } = await params;

    const companyId = await getCompanyIdAndVerifyOwner(userId, jobId, userRole);
    if (!companyId) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    // Lookup user by phone or email
    const { identifier, role } = parsed.data;
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!targetUser) return err("User not found", 404);

    const member = await prisma.hiringTeam.upsert({
      where: { jobPostingId_userId: { jobPostingId: jobId, userId: targetUser.id } },
      update: { role },
      create: { jobPostingId: jobId, userId: targetUser.id, role },
    });

    await logAdminAction({
      adminId: userId,
      action: "HIRING_TEAM_MEMBER_ADDED",
      targetType: "JobPosting",
      targetId: jobId,
      reason: `Added ${targetUser.email ?? targetUser.phone ?? targetUser.id} as ${role}`,
    });

    return ok(member, 201);
  } catch (e) {
    return parseError(e);
  }
}
