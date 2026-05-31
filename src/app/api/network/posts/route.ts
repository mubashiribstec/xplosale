import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(3000) });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const profile = await prisma.networkProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return err("Network profile not found", 404);

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const post = await prisma.post.create({
      data: { authorProfileId: profile.id, body: parsed.data.body },
    });

    return ok(post, 201);
  } catch (e) {
    return parseError(e);
  }
}
