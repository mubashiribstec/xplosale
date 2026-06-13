import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client before importing the module under test.
const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: { findUnique: (...args: unknown[]) => findUnique(...args) },
  },
}));

import { getEffectiveJobPlan } from "@/verticals/jobs/tier";

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

describe("getEffectiveJobPlan", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns FREE plan with no analytics for a free company", async () => {
    findUnique.mockResolvedValue({ jobPlanKey: "FREE", jobPlanExpiresAt: null, jobPostLimit: 3, jobPostCredits: 0 });
    const plan = await getEffectiveJobPlan("c1");
    expect(plan).toEqual({ key: "FREE", limit: 3, analytics: false, credits: 0 });
  });

  it("returns MONTHLY plan with analytics when not expired", async () => {
    findUnique.mockResolvedValue({ jobPlanKey: "MONTHLY", jobPlanExpiresAt: FUTURE, jobPostLimit: 25, jobPostCredits: 2 });
    const plan = await getEffectiveJobPlan("c2");
    expect(plan).toEqual({ key: "MONTHLY", limit: 25, analytics: true, credits: 2 });
  });

  it("treats MONTHLY with no expiry as active", async () => {
    findUnique.mockResolvedValue({ jobPlanKey: "MONTHLY", jobPlanExpiresAt: null, jobPostLimit: 25, jobPostCredits: 0 });
    const plan = await getEffectiveJobPlan("c3");
    expect(plan.key).toBe("MONTHLY");
    expect(plan.analytics).toBe(true);
  });

  it("downgrades an expired MONTHLY plan to FREE with limit 3 and no analytics", async () => {
    findUnique.mockResolvedValue({ jobPlanKey: "MONTHLY", jobPlanExpiresAt: PAST, jobPostLimit: 25, jobPostCredits: 4 });
    const plan = await getEffectiveJobPlan("c4");
    expect(plan).toEqual({ key: "FREE", limit: 3, analytics: false, credits: 4 });
  });

  it("throws when the company does not exist", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getEffectiveJobPlan("missing")).rejects.toThrow("Company not found");
  });
});
