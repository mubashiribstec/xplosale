/**
 * Server-side structured logger using Pino + pino-roll.
 * Only loaded in the Node.js runtime (guarded in instrumentation.ts).
 * Never throws — all failures degrade silently.
 */

import pino from "pino";
import { join, resolve } from "path";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "fs";

const LOG_DIR   = resolve(process.env.LOG_DIR   ?? "./logs");
const MAX_MB    = parseInt(process.env.LOG_MAX_DIR_MB       ?? "500", 10);
const RETAIN    = parseInt(process.env.LOG_RETENTION_DAYS   ?? "14",  10);

let _logger: pino.Logger | null = null;

function ensureLogDir() {
  mkdirSync(LOG_DIR, { recursive: true });
}

function evictOldLogs() {
  try {
    const now = Date.now();
    const cutoff = RETAIN * 24 * 60 * 60 * 1000;
    let totalBytes = 0;
    const files: Array<{ path: string; mtime: number; size: number }> = [];

    for (const name of readdirSync(LOG_DIR)) {
      if (!name.endsWith(".jsonl")) continue;
      const p = join(LOG_DIR, name);
      const st = statSync(p);
      if (now - st.mtimeMs > cutoff) {
        unlinkSync(p);
        continue;
      }
      totalBytes += st.size;
      files.push({ path: p, mtime: st.mtimeMs, size: st.size });
    }

    // Enforce total size cap — delete oldest first
    const maxBytes = MAX_MB * 1024 * 1024;
    if (totalBytes > maxBytes) {
      files.sort((a, b) => a.mtime - b.mtime);
      for (const f of files) {
        if (totalBytes <= maxBytes) break;
        unlinkSync(f.path);
        totalBytes -= f.size;
      }
    }
  } catch {
    // Log rotation errors must never crash the app
  }
}

export async function initLogger(): Promise<pino.Logger> {
  if (_logger) return _logger;

  ensureLogDir();
  evictOldLogs();

  // Schedule daily eviction (runs while the process is alive)
  setInterval(evictOldLogs, 24 * 60 * 60 * 1000).unref();

  // pino-roll creates a daily-rotating write stream
  const { roll } = await import("pino-roll");
  const fileStream = await roll(join(LOG_DIR, "errors-{date}.jsonl"), {
    frequency: "daily",
    mkdir: true,
    // 50 MB per file — total dir capped separately
    size: "50m",
  });

  _logger = pino(
    {
      level: "warn",
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME ?? "unknown",
      },
    },
    fileStream
  );

  return _logger;
}

export function getLogger(): pino.Logger | null {
  return _logger;
}
