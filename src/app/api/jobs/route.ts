import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(10000),
  regionId: z.string().cuid(),
  remoteType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).default("ONSITE"),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  currency: z.string().default("PKR"),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const regionSlug = searchParams.get("regionSlug");
    const remoteType = searchParams.get("remoteType");
    const minSalary = searchParams.get("minSalary");
    const maxSalary = searchParams.get("maxSalary");
    const keyword = searchParams.get("keyword");
    const statusParam = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

    const session = await getSession();
    const isAdmin = session ? (session.user as unknown as { role: string }).role === "ADMIN" : false;
    const status = (isAdmin && statusParam) ? statusParam : "ACTIVE";

    const where: Record<string, unknown> = { status };

    if (regionSlug) {
      where.region = { slug: regionSlug };
    }

    if (remoteType) {
      where.remoteType = remoteType;
    }

    if (keyword) {
      where.title = { contains: keyword, mode: "insensitive" };
    }

    if (minSalary) where.salaryMin = { gte: parseInt(minSalary, 10) };
    if (maxSalary) where.salaryMax = { lte: parseInt(maxSalary, 10) };

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        include: {
          company: { select: { id: true, name: true, industry: true, verifiedEmployer: true, logoUrl: true } },
          region: { select: { id: true, name: true, slug: true, city: true } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return ok({ jobs, total, page, pages: Math.ceil(total / limit) });
  } catch (e) {
    return parseError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const userId = getUserId(session);

    const body = await req.json() as unknown;
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return err("Validation error", 422, parsed.error.flatten().fieldErrors);

    const employerProfile = await prisma.employerProfile.findUnique({ where: { userId } });
    if (!employerProfile) return err("Employer profile not found", 404);

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const job = await prisma.jobPosting.create({
      data: {
        ...parsed.data,
        companyId: employerProfile.companyId,
        postedByUserId: userId,
        status: "DRAFT",
        expiresAt,
      },
    });

    return ok(job, 201);
  } catch (e) {
    return parseError(e);
  }
}
