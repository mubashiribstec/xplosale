import { describe, it, expect } from "vitest";
import { hashCnic } from "@/lib/cnic-hash";

describe("hashCnic", () => {
  it("returns a hex string of 64 characters", () => {
    const hash = hashCnic("1234567890123");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same input produces same hash", () => {
    expect(hashCnic("1234567890123")).toBe(hashCnic("1234567890123"));
  });

  it("is sensitive to input — different CNIC gives different hash", () => {
    expect(hashCnic("1234567890123")).not.toBe(hashCnic("1234567890124"));
  });

  it("does not expose the raw CNIC number", () => {
    const hash = hashCnic("3520212345678");
    expect(hash).not.toContain("3520212345678");
  });
});
