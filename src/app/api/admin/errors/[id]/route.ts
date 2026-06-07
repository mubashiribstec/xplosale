/**
 * PATCH /api/admin/errors/:id
 * Body: { status: "OPEN" | "RESOLVED" | "IGNORED" }
 * ADMIN only.
 */

import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["OPEN", "RESOLVED", "IGNORED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { id } = await params;

    let body: unknown;
    try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err("Invalid status", 422);

    const updated = await prisma.errorLog.update({
      where: { id },
      data:  { status: parsed.data.status },
      select: { id: true, status: true },
    });

    return ok(updated);
  } catch (e) {
    return parseError(e);
  }
}
