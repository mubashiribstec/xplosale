import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "OFF"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const { searchId } = await params;

    const existing = await prisma.savedSearch.findUnique({ where: { id: searchId } });
    if (!existing) return err("Not found", 404);
    if (existing.userId !== userId) return err("Forbidden", 403);

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const updated = await prisma.savedSearch.update({
      where: { id: searchId },
      data: parsed.data,
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const { searchId } = await params;

    const existing = await prisma.savedSearch.findUnique({ where: { id: searchId } });
    if (!existing) return err("Not found", 404);
    if (existing.userId !== userId) return err("Forbidden", 403);

    await prisma.savedSearch.delete({ where: { id: searchId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
