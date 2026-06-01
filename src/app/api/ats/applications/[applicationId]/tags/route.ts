import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";

const applySchema = z.object({ tagId: z.string() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { applicationId } = await params;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: { jobPostingId: true },
    });
    if (!application) return err("Application not found", 404);

    const allowed = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const appTag = await prisma.applicationTag.upsert({
      where: { applicationId_tagId: { applicationId, tagId: parsed.data.tagId } },
      update: {},
      create: { applicationId, tagId: parsed.data.tagId },
      include: { tag: { select: { id: true, name: true, color: true } } },
    });
    return ok(appTag, 201);
  } catch (e) {
    return parseError(e);
  }
}
