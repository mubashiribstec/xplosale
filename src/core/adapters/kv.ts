import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __kv: Redis | undefined;
}

function createKv(): Redis {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    throw new Error("UPSTASH_REDIS_URL is not set");
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

export const kv: Redis =
  globalThis.__kv ?? (globalThis.__kv = createKv());

if (process.env.NODE_ENV !== "production") globalThis.__kv = kv;
