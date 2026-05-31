import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { requireSession } from "@/core/auth/session";
import { getPresignedGet } from "@/core/adapters/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    if ((session.user as { role: string }).role !== "ADMIN") return err("Forbidden", 403);

    const { userId } = await params;
    const [front, back, selfie] = await Promise.all([
      getPresignedGet("private", `cnic/${userId}/front.jpg`, 60),
      getPresignedGet("private", `cnic/${userId}/back.jpg`, 60),
      getPresignedGet("private", `cnic/${userId}/selfie.jpg`, 60),
    ]);

    return ok({ front, back, selfie });
  } catch (e) {
    return parseError(e);
  }
}
