import { type NextRequest } from "next/server";
import { z } from "zod";
import { ok, err, parseError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const querySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters").max(100),
  type: z.enum(["listing", "job", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export async function GET(req: NextRequest) {
  try {
    // Rate-limit by IP: 60 search requests per minute
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
    const limited = await rateLimit(`search:${ip}`, 60, 60);
    if (!limited.allowed) {
      return err("Too many requests. Please slow down.", 429);
    }

    const { searchParams } = req.nextUrl;
    const raw = {
      q: searchParams.get("q") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = querySchema.safeParse(raw);
    if (!parsed.success) {
      return err("Validation error", 422, parsed.error.flatten().fieldErrors);
    }

    const { q, type, limit } = parsed.data;

    const runListings = type === "listing" || type === "all";
    const runJobs = type === "job" || type === "all";

    const [rawListings, rawJobs] = await Promise.all([
      runListings
        ? prisma.listing.findMany({
            where: {
              status: "ACTIVE",
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
            include: {
              images: { take: 1, orderBy: { order: "asc" } },
              region: { select: { name: true, city: true } },
            },
            take: limit,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      runJobs
        ? prisma.jobPosting.findMany({
            where: {
              status: "ACTIVE",
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            },
            include: {
              company: { select: { id: true, name: true, verifiedEmployer: true } },
              region: { select: { name: true, city: true } },
            },
            take: limit,
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    const listings = rawListings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.price.toString(),
      currency: listing.currency,
      region: { name: listing.region.name, city: listing.region.city },
      imageKey: listing.images[0]?.url ?? null,
      propertyType: listing.propertyType,
      type: "listing" as const,
    }));

    const jobs = rawJobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: {
        id: job.company.id,
        name: job.company.name,
        verifiedEmployer: job.company.verifiedEmployer,
      },
      region: { name: job.region.name, city: job.region.city },
      remoteType: job.remoteType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      currency: job.currency,
      type: "job" as const,
    }));

    return ok({ q, listings, jobs });
  } catch (e) {
    return parseError(e);
  }
}
