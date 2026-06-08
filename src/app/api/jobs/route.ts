import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const skillsArray = z.array(z.string().max(60)).max(30).default([]);

const createSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(10000),
  regionId: z.string().optional(),
  remoteType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).default("ONSITE"),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  currency: z.string().default("USD"),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  postCode: z.string().max(20).optional(),
  companyAddress: z.string().max(300).optional(),
  requiredSkills: skillsArray,
  niceToHaveSkills: skillsArray,
  requiredKeywords: skillsArray,
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
    const JOB_STATUSES = ["DRAFT", "ACTIVE", "CLOSED", "EXPIRED"];
    // Non-admins are pinned to ACTIVE; admins may filter by a valid status only.
    const status = isAdmin && statusParam && JOB_STATUSES.includes(statusParam) ? statusParam : "ACTIVE";

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

    const [employerProfile, dbUser] = await Promise.all([
      prisma.employerProfile.findUnique({ where: { userId }, include: { company: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { bannedSections: true, bannedJobCategories: true } }),
    ]);
    if (!employerProfile) return err("Employer profile not found", 404);

    // Section/category ban check
    if (dbUser?.bannedSections.includes("JOBS")) return err("You are not allowed to post jobs.", 403);

    // Job post limit enforcement
    const company = employerProfile.company;
    const isExpired = company.jobPlanKey === "MONTHLY" && company.jobPlanExpiresAt && company.jobPlanExpiresAt < new Date();
    const effectivePlanKey = isExpired ? "FREE" : company.jobPlanKey;
    const effectiveLimit = isExpired ? 3 : company.jobPostLimit;

    const activeCount = await prisma.jobPosting.count({
      where: { companyId: company.id, status: { in: ["ACTIVE", "DRAFT"] } },
    });

    if (activeCount >= effectiveLimit) {
      if (company.jobPostCredits > 0) {
        await prisma.company.update({ where: { id: company.id }, data: { jobPostCredits: { decrement: 1 } } });
      } else {
        return err(
          effectivePlanKey === "FREE"
            ? `Free plan allows ${effectiveLimit} active posts. Upgrade to Monthly plan or contact admin to purchase extra credits.`
            : `Monthly plan limit (${effectiveLimit} posts) reached. Contact admin to add extra post credits.`,
          422,
          { activeCount, limit: effectiveLimit, planKey: effectivePlanKey }
        );
      }
    }

    // Resolve regionId — for REMOTE jobs, fall back to the worldwide region
    let regionId = parsed.data.regionId;
    if (!regionId) {
      const remoteRegion = await prisma.region.upsert({
        where: { slug: "remote-worldwide" },
        update: {},
        create: {
          id: "remote-worldwide-xps01",
          name: "Remote / Worldwide",
          nameUr: "ریموٹ / عالمی",
          slug: "remote-worldwide",
          city: "Remote",
          country: "REMOTE",
        },
      });
      regionId = remoteRegion.id;
    }

    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    const { regionId: _r, country, city, postCode, companyAddress, ...restData } = parsed.data;
    const job = await prisma.jobPosting.create({
      data: {
        ...restData,
        regionId,
        ...(country ? { country } : {}),
        ...(city ? { city } : {}),
        ...(postCode ? { postCode } : {}),
        ...(companyAddress ? { companyAddress } : {}),
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
