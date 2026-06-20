import { describe, it, expect, vi, beforeEach } from "vitest";

const shopFindUnique = vi.fn();
const shopFindFirst = vi.fn();
const subFindUnique = vi.fn();
const subFindFirst = vi.fn();
const planFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shop: { findUnique: (...a: unknown[]) => shopFindUnique(...a), findFirst: (...a: unknown[]) => shopFindFirst(...a) },
    subscription: { findUnique: (...a: unknown[]) => subFindUnique(...a), findFirst: (...a: unknown[]) => subFindFirst(...a) },
    plan: { findUnique: (...a: unknown[]) => planFindUnique(...a) },
  },
}));

import { generateSlug, getEffectivePlan, getEffectivePlanForUser } from "@/verticals/shops/tier";

const PLANS: Record<string, Record<string, unknown>> = {
  FREE: { key: "FREE", maxShops: 1, maxProducts: 2, maxImagesPerProduct: 2, featuredPlacement: false, analytics: false, customBanner: false },
  PREMIUM: { key: "PREMIUM", maxShops: 5, maxProducts: 30, maxImagesPerProduct: 5, featuredPlacement: true, analytics: true, customBanner: true },
  PROMOTION: { key: "PROMOTION", maxShops: 5, maxProducts: 50, maxImagesPerProduct: 8, featuredPlacement: true, analytics: true, customBanner: true },
};

beforeEach(() => {
  [shopFindUnique, shopFindFirst, subFindUnique, subFindFirst, planFindUnique].forEach((f) => f.mockReset());
  // plan.findUnique resolves by key for every test.
  planFindUnique.mockImplementation(({ where }: { where: { key: string } }) => Promise.resolve(PLANS[where.key] ?? null));
});

describe("generateSlug", () => {
  it("lowercases, strips punctuation, and hyphenates spaces", () => {
    const slug = generateSlug("Ali's  Super Store!!");
    expect(slug).toMatch(/^alis-super-store-[a-z0-9]+$/);
  });

  it("caps the base length and always appends a suffix", () => {
    const slug = generateSlug("x".repeat(100));
    const [base, suffix] = [slug.slice(0, slug.lastIndexOf("-")), slug.slice(slug.lastIndexOf("-") + 1)];
    expect(base.length).toBeLessThanOrEqual(40);
    expect(suffix.length).toBeGreaterThan(0);
  });

  it("produces distinct slugs for the same name (timestamp suffix)", async () => {
    const a = generateSlug("shop");
    await new Promise((r) => setTimeout(r, 5));
    const b = generateSlug("shop");
    expect(a).not.toBe(b);
  });
});

describe("getEffectivePlan", () => {
  it("grants PREMIUM-equivalent limits to a commission-billed shop", async () => {
    shopFindUnique.mockResolvedValue({ billingMode: "COMMISSION" });
    subFindUnique.mockResolvedValue(null);
    const plan = await getEffectivePlan("s1");
    expect(plan.key).toBe("PREMIUM");
    expect(plan.maxProducts).toBe(30);
    expect(plan.isPromotion).toBe(false);
  });

  it("returns FREE for a subscription shop with no active paid sub", async () => {
    shopFindUnique.mockResolvedValue({ billingMode: "SUBSCRIPTION" });
    subFindUnique.mockResolvedValue(null);
    const plan = await getEffectivePlan("s2");
    expect(plan.key).toBe("FREE");
  });

  it("returns PREMIUM for an active PREMIUM subscription", async () => {
    shopFindUnique.mockResolvedValue({ billingMode: "SUBSCRIPTION" });
    subFindUnique.mockResolvedValue({ planKey: "PREMIUM", status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 1e9) });
    const plan = await getEffectivePlan("s3");
    expect(plan.key).toBe("PREMIUM");
    expect(plan.isPromotion).toBe(false);
  });

  it("downgrades an expired subscription to FREE", async () => {
    shopFindUnique.mockResolvedValue({ billingMode: "SUBSCRIPTION" });
    subFindUnique.mockResolvedValue({ planKey: "PREMIUM", status: "ACTIVE", currentPeriodEnd: new Date(Date.now() - 1e9) });
    const plan = await getEffectivePlan("s4");
    expect(plan.key).toBe("FREE");
  });
});

describe("getEffectivePlanForUser", () => {
  it("returns FREE when the user has neither a paid sub nor a commission shop", async () => {
    subFindFirst.mockResolvedValue(null);
    shopFindFirst.mockResolvedValue(null);
    const plan = await getEffectivePlanForUser("u1");
    expect(plan.key).toBe("FREE");
  });

  it("grants PREMIUM when the user owns a commission shop", async () => {
    subFindFirst.mockResolvedValue(null);
    shopFindFirst.mockResolvedValue({ id: "s1" });
    const plan = await getEffectivePlanForUser("u2");
    expect(plan.key).toBe("PREMIUM");
  });

  it("reflects an active promotion subscription", async () => {
    subFindFirst.mockResolvedValue({ planKey: "PROMOTION" });
    shopFindFirst.mockResolvedValue(null);
    const plan = await getEffectivePlanForUser("u3");
    expect(plan.key).toBe("PROMOTION");
    expect(plan.isPromotion).toBe(true);
  });
});
