import { describe, it, expect } from "vitest";
import { canTransitionOrder, SHOPKEEPER_ORDER_TRANSITIONS } from "@/verticals/shops/orders";

describe("shop order state machine", () => {
  it("walks the happy path PENDING → CONFIRMED → PREPARING → READY → COMPLETED", () => {
    expect(canTransitionOrder("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "PREPARING")).toBe(true);
    expect(canTransitionOrder("PREPARING", "READY")).toBe(true);
    expect(canTransitionOrder("READY", "COMPLETED")).toBe(true);
  });

  it("lets a PAYMENT_SUBMITTED order be confirmed or cancelled", () => {
    expect(canTransitionOrder("PAYMENT_SUBMITTED", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("PAYMENT_SUBMITTED", "CANCELLED")).toBe(true);
  });

  it("allows cancellation until the order is READY", () => {
    expect(canTransitionOrder("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("PREPARING", "CANCELLED")).toBe(true);
    // READY can only be completed, not cancelled
    expect(canTransitionOrder("READY", "CANCELLED")).toBe(false);
  });

  it("rejects illegal jumps", () => {
    expect(canTransitionOrder("PENDING", "COMPLETED")).toBe(false);
    expect(canTransitionOrder("PENDING", "READY")).toBe(false);
    expect(canTransitionOrder("CONFIRMED", "COMPLETED")).toBe(false);
  });

  it("treats COMPLETED and CANCELLED as terminal", () => {
    expect(SHOPKEEPER_ORDER_TRANSITIONS.COMPLETED).toEqual([]);
    expect(SHOPKEEPER_ORDER_TRANSITIONS.CANCELLED).toEqual([]);
    expect(canTransitionOrder("COMPLETED", "READY")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "PENDING")).toBe(false);
  });
});
