import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { type NextRequest } from "next/server";

const handleRegex = /^[a-z0-9_]{3,30}$/;

const schema = z.object({
  handle: z.string().regex(handleRegex, "Handle must be 3-30 lowercase letters, numbers, or underscores"),
  headline: z.string().max(160).optional(),
  summary: z.string().max(2000).optional(),
  currentRole: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  visibility: z.enum(["PUBLIC", "CONNECTIONS"]).optional(),
  profilePhotoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const profile = await prisma.networkProfile.findUnique({
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

    const { handle, ...rest } = parsed.data;

    try {
      const profile = await prisma.networkProfile.upsert({
        where: { userId },
        update: { handle, ...rest },
        create: { userId, handle, visibility: "PUBLIC", ...rest },
      });
      return ok(profile);
    } catch (upsertErr) {
      if (upsertErr instanceof Error && (upsertErr as { code?: string }).code === "P2002") {
        return err("This handle is already taken", 409);
      }
      throw upsertErr;
    }
  } catch (e) { return parseError(e); }
}
