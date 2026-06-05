import Redis from "ioredis";
import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export const kv: Redis =
  globalThis.__redis ??
  (globalThis.__redis = new Redis(env.UPSTASH_REDIS_URL, {
    tls: env.UPSTASH_REDIS_URL.startsWith("rediss://") ? {} : undefined,
    connectTimeout: 8000,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  }));

export async function kvGet(key: string): Promise<string | null> {
  return kv.get(key);
}

export async function kvSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  await kv.set(key, value, "EX", ttlSeconds);
}

export async function kvDel(key: string): Promise<void> {
  await kv.del(key);
}
