import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { getPresignedGet } from "@/core/adapters/storage";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { docType: true },
    });
    if (!user) return err("User not found", 404);

    const isPassport = user.docType === "PASSPORT";
    const folder = isPassport ? "passport" : "cnic";

    const [front, selfie] = await Promise.all([
      getPresignedGet("private", `${folder}/${userId}/front.jpg`, 60),
      getPresignedGet("private", `${folder}/${userId}/selfie.jpg`, 60),
    ]);

    let back: string | null = null;
    if (!isPassport) {
      back = await getPresignedGet("private", `cnic/${userId}/back.jpg`, 60);
    }

    return ok({ docType: user.docType ?? "CNIC", front, back, selfie });
  } catch (e) {
    return parseError(e);
  }
}
