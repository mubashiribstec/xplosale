/**
 * Edge-compatible Upstash Redis REST API wrapper.
 * ioredis uses Node.js TCP sockets and cannot run in the Edge Runtime.
 * This module uses the Upstash REST API via fetch, which works everywhere.
 *
 * Required env vars (optional — middleware degrades gracefully without them):
 *   UPSTASH_REDIS_REST_URL   https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN xxxxxxxx
 */

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstashRest(args: (string | number)[]): Promise<unknown> {
  if (!REST_URL || !REST_TOKEN) return null;
  try {
    const res = await fetch(REST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      // Prevent caching so ban checks are always fresh
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json() as { result: unknown };
    return json.result;
  } catch {
    return null;
  }
}

export async function edgeKvGet(key: string): Promise<string | null> {
  const result = await upstashRest(["GET", key]);
  return typeof result === "string" ? result : null;
}

// Set a key only if it doesn't exist (NX) — used for per-minute throttling
export async function edgeKvSetNx(key: string, value: string, ttlSeconds: number): Promise<void> {
  await upstashRest(["SET", key, value, "EX", ttlSeconds, "NX"]);
}

export async function edgeKvSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await upstashRest(["SET", key, value, "EX", ttlSeconds]);
}

export async function edgeKvDel(key: string): Promise<void> {
  await upstashRest(["DEL", key]);
}
