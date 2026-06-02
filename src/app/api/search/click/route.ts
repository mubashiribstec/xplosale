import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const clickSchema = z.object({
  vertical: z.string().min(1).max(50),
  query: z.string().max(500),
  clickedId: z.string().min(1).max(200),
  clickedType: z.string().min(1).max(100),
  position: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = clickSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const session = await getSession();
    const userId = session ? getUserId(session) : null;

    await prisma.searchClickLog.create({
      data: {
        userId,
        vertical: parsed.data.vertical,
        query: parsed.data.query,
        clickedId: parsed.data.clickedId,
        clickedType: parsed.data.clickedType,
        position: parsed.data.position,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return parseError(e);
  }
}
