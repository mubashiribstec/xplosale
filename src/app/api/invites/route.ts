import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { NotificationKind } from "@prisma/client";

const bodySchema = z.object({
  jobPostingId: z.string().cuid(),
  candidateId: z.string().cuid(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json() as unknown;
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { jobPostingId, candidateId, message } = parsed.data;

    const employerProfile = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { companyId: true },
    });
    if (!employerProfile) return err("Employer profile not found", 403);

    const { companyId } = employerProfile;

    const jobPosting = await prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
      select: { id: true, title: true, companyId: true, company: { select: { name: true } } },
    });
    if (!jobPosting) return err("Job posting not found", 404);
    if (jobPosting.companyId !== companyId) return err("Forbidden", 403);

    // Guard 1: do-not-contact
    const doNotContact = await prisma.candidateDoNotContact.findUnique({
      where: { userId: candidateId },
    });
    if (doNotContact) return err("Candidate has opted out of invitations", 403);

    // Guard 2: recruiterDiscoverable
    const jobSeekerProfile = await prisma.jobSeekerProfile.findUnique({
      where: { userId: candidateId },
      select: { recruiterDiscoverable: true },
    });
    if (!jobSeekerProfile?.recruiterDiscoverable) return err("Candidate profile is not visible", 403);

    // Guard 3: already invited
    const existing = await prisma.inviteToApply.findUnique({
      where: { jobPostingId_candidateUserId: { jobPostingId, candidateUserId: candidateId } },
    });
    if (existing) return err("Already invited", 409);

    // Guard 4: daily cap per company
    const dailyCap = parseInt(process.env.INVITE_TO_APPLY_DAILY_CAP_PER_COMPANY ?? "50", 10);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const companyDailyCount = await prisma.inviteToApply.count({
      where: { companyId, sentAt: { gte: oneDayAgo } },
    });
    if (companyDailyCount >= dailyCap) return err("Daily invite limit reached for this company", 429);

    // Guard 5: monthly cap per candidate
    const monthlyCap = parseInt(process.env.INVITE_TO_APPLY_MONTHLY_CAP_PER_CANDIDATE ?? "5", 10);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const candidateMonthlyCount = await prisma.inviteToApply.count({
      where: { candidateUserId: candidateId, sentAt: { gte: startOfMonth } },
    });
    if (candidateMonthlyCount >= monthlyCap) return err("Candidate has reached the monthly invitation limit", 429);

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const invite = await prisma.inviteToApply.create({
      data: {
        jobPostingId,
        companyId,
        senderUserId: userId,
        candidateUserId: candidateId,
        message,
        expiresAt,
      },
    });

    await prisma.notification.create({
      data: {
        userId: candidateId,
        kind: NotificationKind.INVITE_TO_APPLY,
        payload: {
          message: `You've been invited to apply to ${jobPosting.title} at ${jobPosting.company.name}`,
          inviteId: invite.id,
          jobPostingId,
          jobTitle: jobPosting.title,
          companyName: jobPosting.company.name,
        },
      },
    });

    return ok(invite, 201);
  } catch (e) {
    return parseError(e);
  }
}
