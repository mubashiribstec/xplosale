import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { authorProfile: { select: { userId: true } } },
    });
    if (!post) return err("Post not found", 404);
    if (post.authorProfile.userId !== userId) return err("Forbidden", 403);

    await prisma.post.delete({ where: { id: postId } });

    return ok({ deleted: true });
  } catch (e) {
    return parseError(e);
  }
}
