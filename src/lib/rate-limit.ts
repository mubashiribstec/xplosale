// Sliding-window rate limiter backed by Upstash Redis (via ioredis)
// Usage: const result = await rateLimit("otp:send:+92...", 3, 3600);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix seconds
}

// Lazy import to avoid loading ioredis during build
async function getKv() {
  const { kv } = await import("@/core/adapters/kv");
  return kv;
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const kv = await getKv();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;
  const redisKey = `rl:${key}`;

  // Sliding window: store timestamps as sorted set members
  const pipeline = kv.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
  pipeline.zcard(redisKey);
  pipeline.expire(redisKey, windowSeconds + 1);
  const results = await pipeline.exec();

  const count = (results?.[2]?.[1] as number) ?? 0;
  const resetAt = Math.floor((now + windowMs) / 1000);

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
  };
}
