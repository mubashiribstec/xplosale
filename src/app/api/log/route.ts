/**
 * POST /api/log — client-side error ingestion.
 * Accepts a batch of events, rate-limits per session/IP,
 * scrubs + fingerprints + upserts into ErrorLog.
 * Returns 204 immediately; all DB/disk work is fire-and-forget.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { logError } from "@/lib/log-error";
import { createHash } from "crypto";

const eventSchema = z.object({
  source:          z.literal("CLIENT"),
  level:           z.enum(["ERROR", "WARN", "DEAD_CLICK"]),
  message:         z.string().max(1000),
  stack:           z.string().max(5000).optional().nullable(),
  route:           z.string().max(500).optional().nullable(),
  httpMethod:      z.string().max(10).optional().nullable(),
  httpStatus:      z.number().int().optional().nullable(),
  requestPath:     z.string().max(500).optional().nullable(),
  component:       z.string().max(200).optional().nullable(),
  elementLabel:    z.string().max(200).optional().nullable(),
  elementSelector: z.string().max(500).optional().nullable(),
  userRole:        z.enum(["USER", "PARTNER", "ADMIN"]).optional().nullable(),
  sessionHash:     z.string().max(64).optional().nullable(),
  breadcrumbs:     z.array(z.unknown()).max(10).optional().nullable(),
  userAgent:       z.string().max(300).optional().nullable(),
  appVersion:      z.string().max(50).optional().nullable(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
});

function sessionKey(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const sid = req.cookies.get("authjs.session-token")?.value?.slice(0, 20) ?? ip;
  return createHash("sha256").update(sid).digest("hex").slice(0, 16);
}

export async function POST(req: NextRequest) {
  // Body-size guard (reject before parsing)
  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > 32_768) {
    return new NextResponse(null, { status: 413 });
  }

  const key = sessionKey(req);
  const limit = await rateLimit(`errlog:${key}`, 60, 60); // 60 events/min
  if (!limit.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return new NextResponse(null, { status: 422 });
  }

  // Fire-and-forget: respond 204 immediately, process in background
  const work = parsed.data.events.map((ev) =>
    logError({ ...ev, source: "CLIENT" as const })
  );
  void Promise.allSettled(work);

  return new NextResponse(null, { status: 204 });
}
