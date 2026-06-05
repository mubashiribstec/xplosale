import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(1000) });

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: { author: { select: { id: true, name: true } } },
    });

    return ok({ comments });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { postId } = await params;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const comment = await prisma.postComment.create({
      data: { postId, authorId: userId, body: parsed.data.body },
    });

    return ok(comment, 201);
  } catch (e) {
    return parseError(e);
  }
}
