import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";
import { encodeCursor, decodeCursor, andConditions, buildTsQuery } from "@/core/search/query";

describe("cursor encode/decode", () => {
  it("round-trips an offset", () => {
    expect(decodeCursor(encodeCursor(0))).toBe(0);
    expect(decodeCursor(encodeCursor(42))).toBe(42);
    expect(decodeCursor(encodeCursor(1000))).toBe(1000);
  });

  it("returns 0 for undefined / garbage / negative cursors", () => {
    expect(decodeCursor(undefined)).toBe(0);
    expect(decodeCursor("not-base64!!")).toBe(0);
    expect(decodeCursor(Buffer.from(JSON.stringify({ offset: -5 })).toString("base64url"))).toBe(0);
    expect(decodeCursor(Buffer.from(JSON.stringify({ nope: 1 })).toString("base64url"))).toBe(0);
  });
});

describe("andConditions", () => {
  it("returns TRUE when there are no conditions", () => {
    const sql = andConditions([]);
    expect(sql.sql.trim()).toBe("TRUE");
  });

  it("drops falsy fragments and keeps real ones", () => {
    const sql = andConditions([
      false,
      null,
      undefined,
      Prisma.sql`a = ${1}`,
      Prisma.sql`b = ${2}`,
    ]);
    // Two surviving fragments contribute two bound values.
    expect(sql.values).toEqual([1, 2]);
    expect(sql.sql).toContain("AND");
  });
});

describe("buildTsQuery", () => {
  it("strips NUL bytes and trims, binding the cleaned input", () => {
    const sql = buildTsQuery("  hel\x00lo  ");
    expect(sql.values).toEqual(["hello"]);
  });

  it("passes ordinary search text through as a bound value (no injection)", () => {
    const sql = buildTsQuery("ca'r; DROP TABLE");
    expect(sql.values).toEqual(["ca'r; DROP TABLE"]);
    expect(sql.sql).toContain("websearch_to_tsquery");
  });
});
