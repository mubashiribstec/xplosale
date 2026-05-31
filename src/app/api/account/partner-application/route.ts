import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  partnerType: z.enum(["INDIVIDUAL", "BUSINESS", "AGENCY"]),
  businessName: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().min(20).max(2000),
});

export async function GET() {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const application = await prisma.partnerApplication.findUnique({
      where: { userId },
    });

    return ok(application);
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession().catch(() => null);
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verificationStatus: true },
    });
    if (!user) return err("User not found", 404);
    if (user.verificationStatus !== "VERIFIED") {
      return err("Identity verification required before applying for partner status", 403);
    }

    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const application = await prisma.partnerApplication.upsert({
      where: { userId },
      update: {
        ...parsed.data,
        website: parsed.data.website || null,
        status: "PENDING",
        reviewedAt: null,
        reviewedById: null,
        reason: null,
      },
      create: {
        userId,
        ...parsed.data,
        website: parsed.data.website || null,
      },
    });

    return ok(application, 201);
  } catch (e) {
    return parseError(e);
  }
}
