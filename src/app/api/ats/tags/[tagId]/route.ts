import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { canManagePipelineStages } from "@/verticals/jobs/ats/permissions";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const userRole = (session.user as { role: string }).role;
    const { tagId } = await params;

    const tag = await prisma.candidateTag.findUnique({ where: { id: tagId } });
    if (!tag) return err("Tag not found", 404);

    const allowed = await canManagePipelineStages(userId, tag.companyId, userRole);
    if (!allowed) return err("Forbidden", 403);

    await prisma.candidateTag.delete({ where: { id: tagId } });
    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
