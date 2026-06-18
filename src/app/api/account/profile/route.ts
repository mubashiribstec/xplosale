import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { type NextRequest } from "next/server";

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  image: z.string().url().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);
    if (Object.keys(parsed.data).length === 0) return err("Nothing to update", 422);

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: parsed.data,
        select: { id: true, name: true, phone: true, image: true, email: true },
      });
      return ok(user);
    } catch (updateErr) {
      if (updateErr instanceof Error && (updateErr as { code?: string }).code === "P2002") {
        return err("This phone number is already in use", 409);
      }
      throw updateErr;
    }
  } catch (e) { return parseError(e); }
}
