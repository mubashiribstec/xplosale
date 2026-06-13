import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { getEffectiveJobPlan } from "@/verticals/jobs/tier";

interface Params {
  params: Promise<{ jobId: string }>;
}

const schema = z.object({
  kind: z.enum(["VIEW", "APPLY_CLICK", "CONTACT_CLICK", "SHARE_CLICK"]),
});

/** POST /api/jobs/[jobId]/track — anonymous engagement beacon (premium employers only). */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { jobId } = await params;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "anon";
    try {
      const rl = await rateLimit(`job-track:${ip}`, 60, 60);
      if (!rl.allowed) return ok({ tracked: false });
    } catch {
      // Redis outage — tracking is best-effort, let it through
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return err("Invalid payload", 422);
    const { kind } = parsed.data;

    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, companyId: true },
    });
    if (!job || job.status !== "ACTIVE") return ok({ tracked: false });

    const plan = await getEffectiveJobPlan(job.companyId);
    if (!plan.analytics) return ok({ tracked: false });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.jobAnalyticsEvent.findFirst({
        where: { jobPostingId: jobId, kind, day: today },
        select: { id: true },
      });
      if (existing) {
        await tx.jobAnalyticsEvent.update({ where: { id: existing.id }, data: { count: { increment: 1 } } });
      } else {
        await tx.jobAnalyticsEvent.create({ data: { jobPostingId: jobId, kind, day: today, count: 1 } });
      }
    });

    return ok({ tracked: true });
  } catch {
    // Never surface tracking failures to visitors
    return ok({ tracked: false });
  }
}
