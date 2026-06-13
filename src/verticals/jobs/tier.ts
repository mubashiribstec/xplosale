/**
 * Job posting tier enforcement helpers.
 * Unlike shops, jobs has no Plan table — Company.jobPlanKey is a plain
 * "FREE" | "MONTHLY" string with an optional expiry and extra credits.
 */

import { prisma } from "@/lib/prisma";

export interface EffectiveJobPlan {
  key: "FREE" | "MONTHLY";
  limit: number;
  analytics: boolean;
  credits: number;
}

const FREE_POST_LIMIT = 3;

/** Returns the active job-posting plan for a company, accounting for MONTHLY expiry. */
export async function getEffectiveJobPlan(companyId: string): Promise<EffectiveJobPlan> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { jobPlanKey: true, jobPlanExpiresAt: true, jobPostLimit: true, jobPostCredits: true },
  });
  if (!company) throw new Error("Company not found");

  const isExpired = company.jobPlanKey === "MONTHLY" && company.jobPlanExpiresAt != null && company.jobPlanExpiresAt < new Date();
  const key = isExpired ? "FREE" : (company.jobPlanKey === "MONTHLY" ? "MONTHLY" : "FREE");

  return {
    key,
    limit: isExpired ? FREE_POST_LIMIT : company.jobPostLimit,
    analytics: key === "MONTHLY",
    credits: company.jobPostCredits,
  };
}

/** Number of ACTIVE/DRAFT job posts a company currently has, counted against its limit. */
export async function countActiveJobPosts(companyId: string): Promise<number> {
  return prisma.jobPosting.count({
    where: { companyId, status: { in: ["ACTIVE", "DRAFT"] } },
  });
}
