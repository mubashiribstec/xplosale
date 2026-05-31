import { type NextRequest } from "next/server";
import { ok, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;

    const [people, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          jobSeekerProfile: { openToWork: true },
          networkProfile: { visibility: "PUBLIC" },
        },
        select: {
          id: true,
          name: true,
          networkProfile: {
            select: {
              handle: true,
              headline: true,
              profilePhotoUrl: true,
              location: true,
            },
          },
          jobSeekerProfile: {
            select: {
              headline: true,
              expectedSalaryMin: true,
              expectedSalaryMax: true,
              currency: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({
        where: {
          jobSeekerProfile: { openToWork: true },
          networkProfile: { visibility: "PUBLIC" },
        },
      }),
    ]);

    return ok({ people, total, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}
