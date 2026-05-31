import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { type NextRequest } from "next/server";

const schema = z.object({
  bio: z.string().max(500).optional(),
  agentTier: z.enum(["NONE", "BASIC", "PRO"]).optional(),
  areasServed: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: getUserId(session) },
    });
    return ok(profile);
  } catch (e) { return parseError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const profile = await prisma.sellerProfile.upsert({
      where: { userId },
      update: { ...parsed.data, areasServed: parsed.data.areasServed ?? undefined },
      create: { userId, agentTier: "NONE", ...parsed.data },
    });
    return ok(profile);
  } catch (e) { return parseError(e); }
}
