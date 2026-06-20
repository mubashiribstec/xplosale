import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  vertical: z.enum(["jobs", "marketplace", "companies"]),
  name: z.string().min(1).max(100),
  queryJson: z.record(z.string(), z.unknown()),
  frequency: z.enum(["DAILY", "WEEKLY", "OFF"]).default("OFF"),
});

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const searches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return ok(searches);
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const { vertical, name, queryJson, frequency } = parsed.data;

    const saved = await prisma.savedSearch.create({
      data: { userId, vertical, name, queryJson: queryJson as import("@prisma/client").Prisma.InputJsonValue, frequency },
    });

    return ok(saved, 201);
  } catch (e) {
    return parseError(e);
  }
}
