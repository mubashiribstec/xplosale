import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const applicationId = req.nextUrl.searchParams.get("applicationId");
    if (!applicationId) return err("applicationId required", 400);

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { jobPostingId: true },
    });
    if (!application) return err("Not found", 404);

    const canAccess = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!canAccess) return err("Forbidden", 403);

    const assignments = await prisma.testAssignment.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        dueAt: true,
        scorePercent: true,
        autoGraded: true,
        template: { select: { id: true, name: true, durationMin: true } },
      },
    });

    return ok(assignments);
  } catch (e) {
    return parseError(e);
  }
}

const createSchema = z.object({
  applicationId: z.string().cuid(),
  templateId: z.string().cuid(),
  dueAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { applicationId, templateId, dueAt } = parsed.data;

    // Fetch application to get jobPostingId and candidate userId
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        jobPostingId: true,
        jobPosting: { select: { companyId: true } },
        jobSeeker: { select: { userId: true } },
      },
    });
    if (!application) return err("Application not found", 404);

    // Permission check: must be hiring team member or company owner
    const canAccess = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!canAccess) return err("Forbidden", 403);

    // Verify template is published and belongs to same company
    const template = await prisma.testTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, name: true, isPublished: true, companyId: true },
    });
    if (!template) return err("Template not found", 404);
    if (!template.isPublished) return err("Template is not published", 422);
    if (template.companyId !== application.jobPosting.companyId) {
      return err("Template does not belong to this company", 422);
    }

    // Create assignment and notification in a transaction
    const assignment = await prisma.$transaction(async (tx) => {
      const newAssignment = await tx.testAssignment.create({
        data: {
          applicationId,
          templateId,
          assignedByUserId: userId,
          dueAt: new Date(dueAt),
          status: "ASSIGNED",
        },
      });

      // Notify candidate
      await tx.notification.create({
        data: {
          userId: application.jobSeeker.userId,
          kind: "TEST_ASSIGNED",
          payload: {
            assignmentId: newAssignment.id,
            testName: template.name,
            dueAt,
          },
        },
      });

      return newAssignment;
    });

    return ok(assignment, 201);
  } catch (e) {
    return parseError(e);
  }
}
