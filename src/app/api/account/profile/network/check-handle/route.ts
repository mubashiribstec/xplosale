import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireSession, getUserId } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle")?.toLowerCase().trim();
  if (!handle || !/^[a-z0-9_]{3,30}$/.test(handle)) {
    return err("Invalid handle format", 422);
  }
  try {
    const session = await requireSession().catch(() => null);
    const currentUserId = session ? getUserId(session) : null;
    const existing = await prisma.networkProfile.findUnique({ where: { handle }, select: { userId: true } });
    const available = !existing || existing.userId === currentUserId;
    return ok({ handle, available });
  } catch {
    return ok({ handle, available: false });
  }
}
