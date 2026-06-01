import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canAccessJobApplications } from "@/verticals/jobs/ats/permissions";
import { createNotification } from "@/core/messaging/rooms";

const createSchema = z.object({
  body: z.string().min(1).max(2000),
  mentions: z.array(z.string()).default([]),
});

export async function GET(
  _req: NextRequest,
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

    const notes = await prisma.candidateNote.findMany({
      where: { applicationId },
      include: {
        author: { select: { id: true, name: true, networkProfile: { select: { handle: true, profilePhotoUrl: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return ok(notes);
  } catch (e) {
    return parseError(e);
  }
}

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
      include: { jobPosting: { select: { id: true, title: true } } },
    });
    if (!application) return err("Application not found", 404);

    const allowed = await canAccessJobApplications(userId, application.jobPostingId, userRole);
    if (!allowed) return err("Forbidden", 403);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const note = await prisma.candidateNote.create({
      data: {
        applicationId,
        authorId: userId,
        body: parsed.data.body,
        mentions: parsed.data.mentions.length > 0 ? parsed.data.mentions : undefined,
      },
      include: {
        author: { select: { id: true, name: true, networkProfile: { select: { handle: true, profilePhotoUrl: true } } } },
      },
    });

    // Send MENTION notifications to mentioned users (deduplicated, skip self)
    const mentioned = [...new Set(parsed.data.mentions)].filter((id) => id !== userId);
    await Promise.all(
      mentioned.map((mentionedUserId) =>
        createNotification(mentionedUserId, "MENTION", {
          noteId: note.id,
          applicationId,
          jobTitle: application.jobPosting.title,
          authorId: userId,
        })
      )
    );

    return ok(note, 201);
  } catch (e) {
    return parseError(e);
  }
}
