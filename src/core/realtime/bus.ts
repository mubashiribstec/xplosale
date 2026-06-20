/**
 * Real-time pub/sub bus.
 *
 * Primary transport is an in-process Node EventEmitter, so live delivery works
 * on a single instance with NO external dependency. Redis is an OPTIONAL
 * fan-out layer for multi-instance deployments: when it is healthy, publishes
 * go through Redis and a single shared pattern-subscriber re-emits them onto the
 * local emitter — so every local listener fires exactly once, whether or not
 * Redis is in play.
 *
 * SSE endpoints only ever read from the local emitter via `subscribe`.
 * All channels are namespaced with the `rt:` prefix.
 */

import { EventEmitter } from "node:events";
import Redis from "ioredis";
import { env } from "@/lib/env";

interface BusGlobal {
  emitter?: EventEmitter;
  sub?: Redis;
  pub?: Redis;
  redisReady?: boolean;
  redisTried?: boolean;
}

const g = globalThis as unknown as { __rtBus?: BusGlobal };
const store: BusGlobal = (g.__rtBus ??= {});

const emitter = (store.emitter ??= (() => {
  const e = new EventEmitter();
  e.setMaxListeners(0); // many concurrent SSE connections
  return e;
})());

function makeRedis(): Redis {
  return new Redis(env.UPSTASH_REDIS_URL, {
    tls: env.UPSTASH_REDIS_URL.startsWith("rediss://") ? {} : undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
  });
}

/**
 * Lazily attempt to wire Redis. If it never connects we silently stay
 * in-process only. Safe to call repeatedly.
 */
function ensureRedis(): void {
  if (store.redisTried) return;
  store.redisTried = true;

  try {
    const sub = makeRedis();
    const pub = makeRedis();
    store.sub = sub;
    store.pub = pub;

    const markDown = () => { store.redisReady = false; };
    sub.on("ready", () => { store.redisReady = true; });
    sub.on("end", markDown);
    sub.on("error", markDown);
    pub.on("error", markDown);

    // One pattern subscription covers every channel; re-emit locally.
    sub.psubscribe("rt:*").catch(markDown);
    sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
      emitter.emit(channel, message);
    });

    // Kick off the lazy connections.
    sub.connect().catch(markDown);
    pub.connect().catch(markDown);
  } catch {
    store.redisReady = false;
  }
}

/** Publish a string payload to a channel (channel should start with `rt:`). */
export function publish(channel: string, data: string): void {
  ensureRedis();
  if (store.redisReady && store.pub) {
    // Goes out to Redis and loops back to every instance (incl. this one)
    // via the shared pattern subscriber, so we do NOT emit locally here.
    store.pub.publish(channel, data).catch(() => {
      // Redis hiccuped — fall back to a local emit so same-instance
      // listeners still get it.
      emitter.emit(channel, data);
    });
    return;
  }
  emitter.emit(channel, data);
}

/** Subscribe to a channel. Returns an unsubscribe function. */
export function subscribe(channel: string, handler: (data: string) => void): () => void {
  ensureRedis();
  emitter.on(channel, handler);
  return () => emitter.off(channel, handler);
}
