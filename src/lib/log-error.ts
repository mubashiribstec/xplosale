/**
 * logError() — server-side error ingestion.
 * Scrubs PII, fingerprints, writes to disk (Pino) and upserts into Postgres.
 * Never throws — all paths degrade silently.
 */

import { createHash } from "crypto";
import type { $Enums } from "@prisma/client";

type ErrorSource = $Enums.ErrorSource;
type ErrorLevel  = $Enums.ErrorLevel;

const SECRET_PATTERNS = [
  /\b[A-Za-z0-9+/]{20,}\b/g,                        // long base64 tokens
  /Authorization:\s*\S+/gi,
  /cookie:\s*[^\r\n]+/gi,
  /password[=:]\s*\S+/gi,
  /token[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
  /CNIC\s*[=:]\s*\d+/gi,
  /\b\d{13}\b/g,                                      // 13-digit CNIC
  /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi,                // email
  /\+?[\d\s\-()]{10,15}/g,                            // phone-ish
  /(\?|&)[^=]*(token|key|secret|auth)[^&]*/gi,        // query-string secrets
];

export function scrubPii(text: string | null | undefined): string | null {
  if (!text) return null;
  let out = text;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, "[REDACTED]");
  }
  return out.slice(0, 4000);
}

function scrubUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, "http://x");
    for (const key of u.searchParams.keys()) {
      if (/token|key|secret|auth|code/i.test(key)) {
        u.searchParams.set(key, "[REDACTED]");
      }
    }
    return u.pathname + (u.search || "");
  } catch {
    return scrubPii(url);
  }
}

/** Stable fingerprint: level + normalised message + top-stack-frame + route */
function fingerprint(
  level: string,
  message: string,
  stack: string | null | undefined,
  route: string | null | undefined
): string {
  const msg = message.replace(/\b[\da-f-]{8,}\b/gi, "<id>").slice(0, 200);
  const frame = stack?.split("\n").slice(1, 2).join("").trim() ?? "";
  return createHash("sha1")
    .update(`${level}|${msg}|${frame}|${route ?? ""}`)
    .digest("hex");
}

export interface LogPayload {
  source: ErrorSource;
  level: ErrorLevel;
  message: string;
  stack?: string | null;
  route?: string | null;
  httpMethod?: string | null;
  httpStatus?: number | null;
  requestPath?: string | null;
  component?: string | null;
  elementLabel?: string | null;
  elementSelector?: string | null;
  userRole?: string | null;
  sessionHash?: string | null;
  breadcrumbs?: unknown;
  userAgent?: string | null;
  appVersion?: string | null;
}

export async function logError(raw: LogPayload): Promise<void> {
  try {
    const message      = scrubPii(raw.message) ?? "(empty)";
    const stack        = scrubPii(raw.stack);
    const route        = scrubUrl(raw.route);
    const requestPath  = scrubUrl(raw.requestPath);
    const fp           = fingerprint(raw.level, message, stack, route);
    const now          = new Date();

    // Disk log — degrade silently if logger not ready
    const { getLogger } = await import("@/lib/logger.server");
    const logger = getLogger();
    if (logger) {
      logger.warn({
        fp,
        source:  raw.source,
        level:   raw.level,
        message,
        stack,
        route,
        httpStatus: raw.httpStatus,
        userRole:   raw.userRole,
        sessionHash: raw.sessionHash,
      });
    }

    // DB upsert — group duplicates by fingerprint
    const { prisma } = await import("@/lib/prisma");
    await prisma.errorLog.upsert({
      where:  { fingerprint: fp },
      create: {
        fingerprint:     fp,
        source:          raw.source,
        level:           raw.level,
        message,
        stack,
        route,
        httpMethod:      raw.httpMethod ?? null,
        httpStatus:      raw.httpStatus ?? null,
        requestPath,
        component:       raw.component ?? null,
        elementLabel:    raw.elementLabel ?? null,
        elementSelector: raw.elementSelector ?? null,
        userRole:        raw.userRole ?? null,
        sessionHash:     raw.sessionHash ?? null,
        breadcrumbs:     raw.breadcrumbs ?? undefined,
        userAgent:       scrubPii(raw.userAgent),
        appVersion:      raw.appVersion ?? null,
        firstSeenAt:     now,
        lastSeenAt:      now,
      },
      update: {
        count:      { increment: 1 },
        lastSeenAt: now,
        // Update these so the latest context is visible in admin
        stack:      stack ?? undefined,
        httpStatus: raw.httpStatus ?? undefined,
        userAgent:  scrubPii(raw.userAgent) ?? undefined,
        breadcrumbs: raw.breadcrumbs ?? undefined,
        // Re-open if it recurs after being resolved/ignored
        status: "OPEN",
      },
    });
  } catch {
    // logError must never throw
  }
}
