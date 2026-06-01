import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";
import { getEmailClient } from "@/core/adapters/email";
import { renderTemplate, renderTemplateHtml } from "@/verticals/jobs/ats/template-vars";

const sendSchema = z.object({
  applicationId: z.string(),
  templateId: z.string().optional(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const raw = await req.json() as unknown;
    const parsed = sendSchema.safeParse(raw);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { applicationId, templateId, subject, body } = parsed.data;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobPosting: { select: { id: true, title: true, companyId: true, company: { select: { name: true } } } },
        jobSeeker: { select: { user: { select: { name: true, email: true } } } },
      },
    });
    if (!application) return err("Application not found", 404);

    const allowed = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const toEmail = application.jobSeeker.user.email;
    if (!toEmail) return err("Candidate has no email address on file", 422);

    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    const vars = {
      "candidate.name": application.jobSeeker.user.name ?? "",
      "candidate.email": toEmail,
      "job.title": application.jobPosting.title,
      "company.name": application.jobPosting.company.name,
      "sender.name": sender?.name ?? "",
    };

    const renderedSubject = renderTemplate(subject, vars);
    const renderedBody = renderTemplate(body, vars);
    const htmlBody = renderTemplateHtml(body, vars);
    const html = `<div style="font-family:sans-serif;max-width:600px">${htmlBody.replace(/\n/g, "<br>")}</div>`;

    const emailClient = getEmailClient();
    const result = await emailClient.send({ to: toEmail, subject: renderedSubject, html });

    await prisma.emailSendLog.create({
      data: {
        applicationId,
        templateId: templateId ?? null,
        sentByUserId: userId,
        toEmail,
        subject: renderedSubject,
        body: renderedBody,
        status: result.status,
        provider: result.provider === "RESEND" ? "RESEND" : "CONSOLE",
      },
    });

    return ok({ status: result.status, provider: result.provider });
  } catch (e) {
    return parseError(e);
  }
}
