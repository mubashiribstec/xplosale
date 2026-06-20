import { describe, it, expect, vi } from "vitest";

// Keep the heavy prisma client out of the test; these functions take an
// explicit client argument anyway.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { effectiveRate, getCommissionBalance, accrueCommissionForOrder } from "@/verticals/shops/commission";

describe("effectiveRate", () => {
  it("uses the shop's custom rate when set", () => {
    expect(effectiveRate({ commissionRate: 7.5 as unknown as never })).toBe(7.5);
  });

  it("falls back to the platform default (5%) when unset", () => {
    expect(effectiveRate({ commissionRate: null })).toBe(5);
  });
});

describe("getCommissionBalance", () => {
  it("returns the summed ledger amount", async () => {
    const client = {
      commissionLedgerEntry: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 123.45 } }) },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const balance = await getCommissionBalance("shop1", client as any);
    expect(balance).toBe(123.45);
  });

  it("treats an empty ledger as zero", async () => {
    const client = {
      commissionLedgerEntry: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }) },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await getCommissionBalance("shop1", client as any)).toBe(0);
  });
});

describe("accrueCommissionForOrder", () => {
  function makeClient(existing: unknown) {
    return {
      commissionLedgerEntry: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn().mockResolvedValue({}),
      },
    };
  }

  it("accrues round(total*rate)/100 for a new order", async () => {
    const client = makeClient(null);
    await accrueCommissionForOrder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      { id: "o1", shopId: "s1", totalAmount: 1000 },
      { commissionRate: 5 as unknown as never },
    );
    expect(client.commissionLedgerEntry.create).toHaveBeenCalledTimes(1);
    const arg = client.commissionLedgerEntry.create.mock.calls[0][0];
    expect(arg.data).toMatchObject({ shopId: "s1", orderId: "o1", type: "ACCRUAL", amount: 50, rate: 5, orderTotal: 1000 });
  });

  it("rounds fractional commission to 2 decimals", async () => {
    const client = makeClient(null);
    await accrueCommissionForOrder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      { id: "o2", shopId: "s1", totalAmount: 999 },
      { commissionRate: 5 as unknown as never },
    );
    expect(client.commissionLedgerEntry.create.mock.calls[0][0].data.amount).toBe(49.95);
  });

  it("is idempotent — does not create a second entry for the same order", async () => {
    const client = makeClient({ id: "existing" });
    await accrueCommissionForOrder(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client as any,
      { id: "o1", shopId: "s1", totalAmount: 1000 },
      { commissionRate: 5 as unknown as never },
    );
    expect(client.commissionLedgerEntry.create).not.toHaveBeenCalled();
  });
});
