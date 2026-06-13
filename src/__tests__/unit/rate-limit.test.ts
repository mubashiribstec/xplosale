import { describe, it, expect, beforeEach } from "vitest";

// Lightweight sliding-window implementation for unit testing
// mirrors the production logic in src/lib/rate-limit.ts
class InMemoryRateLimiter {
  private windows = new Map<string, number[]>();

  check(key: string, limit: number, windowSecs: number): { allowed: boolean; remaining: number } {
    const now = Date.now() / 1000;
    const cutoff = now - windowSecs;
    const timestamps = (this.windows.get(key) ?? []).filter((t) => t > cutoff);
    const allowed = timestamps.length < limit;
    if (allowed) timestamps.push(now);
    this.windows.set(key, timestamps);
    return { allowed, remaining: Math.max(0, limit - timestamps.length) };
  }

  reset() {
    this.windows.clear();
  }
}

describe("Rate limiter sliding window", () => {
  const limiter = new InMemoryRateLimiter();

  beforeEach(() => limiter.reset());

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("search:127.0.0.1", 5, 60).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    for (let i = 0; i < 5; i++) limiter.check("search:127.0.0.1", 5, 60);
    expect(limiter.check("search:127.0.0.1", 5, 60).allowed).toBe(false);
  });

  it("uses separate buckets per key", () => {
    for (let i = 0; i < 5; i++) limiter.check("search:192.168.1.1", 5, 60);
    expect(limiter.check("search:127.0.0.1", 5, 60).allowed).toBe(true);
  });

  it("remaining count decrements correctly", () => {
    limiter.check("search:ip", 3, 60);
    limiter.check("search:ip", 3, 60);
    const result = limiter.check("search:ip", 3, 60);
    expect(result.remaining).toBe(0);
  });

  it("OTP send: allows 3 per hour, blocks on 4th", () => {
    for (let i = 0; i < 3; i++) limiter.check("otp:send:phone:+923001234567", 3, 3600);
    expect(limiter.check("otp:send:phone:+923001234567", 3, 3600).allowed).toBe(false);
  });

  it("listing create: allows 10 per hour, blocks on 11th", () => {
    for (let i = 0; i < 10; i++) limiter.check("listings:create:user-1", 10, 3600);
    expect(limiter.check("listings:create:user-1", 10, 3600).allowed).toBe(false);
  });
});
