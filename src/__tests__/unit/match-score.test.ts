import { describe, it, expect } from "vitest";
import { computeMatchScore } from "@/verticals/jobs/ats/match-score";

const base = { rawText: "", requiredSkills: [], niceToHaveSkills: [], requiredKeywords: [] };

describe("computeMatchScore", () => {
  it("gives full credit (100) when all lists are empty", () => {
    const r = computeMatchScore({ ...base, rawText: "anything" });
    expect(r.score).toBe(100);
  });

  it("weights required 70 / nice 20 / keyword 10", () => {
    // required fully matched, nice + keyword empty (full credit) → 100
    const all = computeMatchScore({
      rawText: "experienced react developer with typescript",
      requiredSkills: ["react", "typescript"],
      niceToHaveSkills: [],
      requiredKeywords: [],
    });
    expect(all.score).toBe(100);

    // required fully missed (0%), nice + keyword empty (full credit)
    // → 0.70*0 + 0.20*100 + 0.10*100 = 30
    const reqMissed = computeMatchScore({
      rawText: "plumber",
      requiredSkills: ["react", "typescript"],
      niceToHaveSkills: [],
      requiredKeywords: [],
    });
    expect(reqMissed.score).toBe(30);
  });

  it("matches whole words only — 'java' does not match 'javascript'", () => {
    const r = computeMatchScore({
      ...base,
      rawText: "senior javascript engineer",
      requiredSkills: ["java"],
    });
    expect(r.requiredMatched).toBe(0);
    expect(r.missedTerms).toContain("java");
  });

  it("is case-insensitive and collects matched/missed terms", () => {
    const r = computeMatchScore({
      ...base,
      rawText: "Built apps in React and Node",
      requiredSkills: ["react", "node", "go"],
    });
    expect(r.requiredMatched).toBe(2);
    expect(r.matchedTerms).toEqual(expect.arrayContaining(["react", "node"]));
    expect(r.missedTerms).toContain("go");
  });

  it("does not crash on regex-special characters in terms", () => {
    const r = computeMatchScore({
      ...base,
      rawText: "experience with c++ and .net",
      requiredSkills: ["c++", ".net"],
    });
    expect(r.requiredMatched).toBe(2);
  });

  it("clamps the score to the 0–100 range", () => {
    const r = computeMatchScore({
      rawText: "react typescript aws docker",
      requiredSkills: ["react"],
      niceToHaveSkills: ["typescript"],
      requiredKeywords: ["aws"],
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("ignores blank terms in a list", () => {
    const r = computeMatchScore({
      ...base,
      rawText: "react",
      requiredSkills: ["react", "  ", ""],
    });
    // blanks are skipped, react matched
    expect(r.requiredMatched).toBe(1);
  });
});
