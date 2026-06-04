import { describe, it, expect } from "vitest";
import { isAdmin, isPartner, isBanned } from "@/lib/guard";
import type { Session } from "next-auth";

function makeSession(overrides: Partial<{ role: string; bannedAt: string | null }>): Session {
  return {
    user: {
      id: "user-1",
      role: overrides.role ?? "USER",
      bannedAt: overrides.bannedAt ?? null,
    },
    expires: new Date(Date.now() + 1e9).toISOString(),
  } as unknown as Session;
}

describe("isAdmin", () => {
  it("returns false for null session", () => {
    expect(isAdmin(null)).toBe(false);
  });

  it("returns false for USER role", () => {
    expect(isAdmin(makeSession({ role: "USER" }))).toBe(false);
  });

  it("returns false for PARTNER role", () => {
    expect(isAdmin(makeSession({ role: "PARTNER" }))).toBe(false);
  });

  it("returns true for ADMIN role", () => {
    expect(isAdmin(makeSession({ role: "ADMIN" }))).toBe(true);
  });
});

describe("isPartner", () => {
  it("returns false for USER role", () => {
    expect(isPartner(makeSession({ role: "USER" }))).toBe(false);
  });

  it("returns true for PARTNER role", () => {
    expect(isPartner(makeSession({ role: "PARTNER" }))).toBe(true);
  });

  it("returns true for ADMIN role (admins have partner-level access)", () => {
    expect(isPartner(makeSession({ role: "ADMIN" }))).toBe(true);
  });
});

describe("isBanned", () => {
  it("returns false when bannedAt is null", () => {
    expect(isBanned(makeSession({ bannedAt: null }))).toBe(false);
  });

  it("returns true when bannedAt is set", () => {
    expect(isBanned(makeSession({ bannedAt: new Date().toISOString() }))).toBe(true);
  });

  it("returns false for null session", () => {
    expect(isBanned(null)).toBe(false);
  });
});
