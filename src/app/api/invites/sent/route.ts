import { type NextRequest } from "next/server";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const employerProfile = await prisma.employerProfile.findUnique({
      where: { userId },
      select: { companyId: true },
    });
    if (!employerProfile) return err("Employer profile not found", 403);

    const { companyId } = employerProfile;
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const [invites, total] = await Promise.all([
      prisma.inviteToApply.findMany({
        where: { companyId },
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          jobPosting: { select: { id: true, title: true } },
          candidate: { select: { id: true, name: true, networkProfile: { select: { handle: true } } } },
        },
      }),
      prisma.inviteToApply.count({ where: { companyId } }),
    ]);

    return ok({ invites, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}
