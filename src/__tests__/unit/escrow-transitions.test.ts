import { describe, it, expect } from "vitest";
import { canTransitionEscrow, ESCROW_TRANSITIONS } from "@/verticals/marketplace/escrow";

describe("escrow state machine", () => {
  it("allows the buyer-release and dispute paths from HELD", () => {
    expect(canTransitionEscrow("HELD", "RELEASED")).toBe(true);
    expect(canTransitionEscrow("HELD", "DISPUTED")).toBe(true);
  });

  it("allows admin resolution either way from DISPUTED", () => {
    expect(canTransitionEscrow("DISPUTED", "RELEASED")).toBe(true);
    expect(canTransitionEscrow("DISPUTED", "REFUNDED")).toBe(true);
  });

  it("rejects refunding straight from HELD (must be disputed first)", () => {
    expect(canTransitionEscrow("HELD", "REFUNDED")).toBe(false);
  });

  it("treats RELEASED and REFUNDED as terminal", () => {
    expect(ESCROW_TRANSITIONS.RELEASED).toEqual([]);
    expect(ESCROW_TRANSITIONS.REFUNDED).toEqual([]);
    expect(canTransitionEscrow("RELEASED", "DISPUTED")).toBe(false);
    expect(canTransitionEscrow("REFUNDED", "RELEASED")).toBe(false);
  });

  it("rejects no-op self transitions", () => {
    expect(canTransitionEscrow("HELD", "HELD")).toBe(false);
    expect(canTransitionEscrow("DISPUTED", "DISPUTED")).toBe(false);
  });
});
