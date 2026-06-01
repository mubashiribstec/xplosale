import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications, canManagePipelineStages } from "@/verticals/jobs/ats/permissions";
import { getEmailClient } from "@/core/adapters/email";
import { renderTemplate } from "@/verticals/jobs/ats/template-vars";
import { logAdminAction } from "@/core/audit";
import { ApplicationStatus } from "@prisma/client";

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("MOVE_STAGE"),
    companyId: z.string(),
    applicationIds: z.array(z.string()).min(1).max(100),
    stageId: z.string(),
  }),
  z.object({
    action: z.literal("ADD_TAG"),
    companyId: z.string(),
    applicationIds: z.array(z.string()).min(1).max(100),
    tagId: z.string(),
  }),
  z.object({
    action: z.literal("SEND_EMAIL"),
    companyId: z.string(),
    applicationIds: z.array(z.string()).min(1).max(100),
    templateId: z.string(),
  }),
  z.object({
    action: z.literal("REJECT_WITH_TEMPLATE"),
    companyId: z.string(),
    applicationIds: z.array(z.string()).min(1).max(100),
    templateId: z.string(),
  }),
]);

function statusFromStageFlags(stage: { isHired: boolean; isRejected: boolean; isInitial: boolean }): ApplicationStatus {
  if (stage.isHired) return "HIRED";
  if (stage.isRejected) return "REJECTED";
  if (stage.isInitial) return "APPLIED";
  return "REVIEWED";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const raw = await req.json() as unknown;
    const parsed = bulkSchema.safeParse(raw);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { action, companyId, applicationIds } = parsed.data;

    // All applications must belong to jobs of this company
    const applications = await prisma.application.findMany({
      where: { id: { in: applicationIds } },
      include: {
        jobPosting: { select: { id: true, title: true, companyId: true, company: { select: { name: true } } } },
        jobSeeker: { select: { user: { select: { name: true, email: true } } } },
      },
    });

    if (applications.length !== applicationIds.length) return err("Some applications not found", 404);
    if (applications.some((a) => a.jobPosting.companyId !== companyId)) return err("Applications must all belong to this company", 422);

    // Permission: must be able to access each application's job
    for (const app of applications) {
      const allowed = await canAccessJobApplications(userId, app.jobPostingId, userRole);
      if (!allowed) return err("Forbidden", 403);
    }

    const results: { applicationId: string; ok: boolean }[] = [];

    if (action === "MOVE_STAGE") {
      const { stageId } = parsed.data;
      const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
      if (!stage || stage.companyId !== companyId) return err("Stage not found", 404);
      const legacyStatus = statusFromStageFlags(stage);

      await prisma.application.updateMany({
        where: { id: { in: applicationIds } },
        data: { currentStageId: stageId, status: legacyStatus },
      });
      applicationIds.forEach((id) => results.push({ applicationId: id, ok: true }));

      await logAdminAction({ adminId: userId, action: "BULK_MOVE_STAGE", targetType: "Company", targetId: companyId, reason: `Moved ${applicationIds.length} applications to stage "${stage.name}"` });
    }

    else if (action === "ADD_TAG") {
      const { tagId } = parsed.data;
      const tag = await prisma.candidateTag.findUnique({ where: { id: tagId } });
      if (!tag || tag.companyId !== companyId) return err("Tag not found", 404);

      for (const appId of applicationIds) {
        await prisma.applicationTag.upsert({
          where: { applicationId_tagId: { applicationId: appId, tagId } },
          update: {},
          create: { applicationId: appId, tagId },
        });
        results.push({ applicationId: appId, ok: true });
      }
    }

    else if (action === "SEND_EMAIL" || action === "REJECT_WITH_TEMPLATE") {
      const { templateId } = parsed.data;
      const template = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
      if (!template || template.companyId !== companyId) return err("Template not found", 404);

      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const emailClient = getEmailClient();

      // If REJECT_WITH_TEMPLATE, find the rejected stage first
      let rejectedStage: { id: string; isRejected: boolean; isHired: boolean; isInitial: boolean } | null = null;
      if (action === "REJECT_WITH_TEMPLATE") {
        rejectedStage = await prisma.pipelineStage.findFirst({
          where: { companyId, isRejected: true },
          select: { id: true, isRejected: true, isHired: true, isInitial: true },
        });
      }

      for (const app of applications) {
        const toEmail = app.jobSeeker.user.email;
        if (!toEmail) { results.push({ applicationId: app.id, ok: false }); continue; }

        const vars = {
          "candidate.name": app.jobSeeker.user.name ?? "",
          "candidate.email": toEmail,
          "job.title": app.jobPosting.title,
          "company.name": app.jobPosting.company.name,
          "sender.name": sender?.name ?? "",
        };

        const subject = renderTemplate(template.subject, vars);
        const body = renderTemplate(template.body, vars);
        const html = `<div style="font-family:sans-serif;max-width:600px">${body.replace(/\n/g, "<br>")}</div>`;

        const result = await emailClient.send({ to: toEmail, subject, html });

        await prisma.emailSendLog.create({
          data: {
            applicationId: app.id,
            templateId,
            sentByUserId: userId,
            toEmail,
            subject,
            body,
            status: result.status,
            provider: result.provider === "RESEND" ? "RESEND" : "CONSOLE",
          },
        });

        if (action === "REJECT_WITH_TEMPLATE" && rejectedStage) {
          await prisma.application.update({
            where: { id: app.id },
            data: { currentStageId: rejectedStage.id, status: "REJECTED" },
          });
        }

        results.push({ applicationId: app.id, ok: true });
      }

      await logAdminAction({ adminId: userId, action: `BULK_${action}`, targetType: "Company", targetId: companyId, reason: `Sent template "${template.name}" to ${results.filter((r) => r.ok).length} candidates` });
    }

    return ok({ results });
  } catch (e) {
    return parseError(e);
  }
}
