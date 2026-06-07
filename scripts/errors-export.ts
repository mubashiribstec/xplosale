/**
 * pnpm errors:export
 *
 * Reads grouped ErrorLog from Postgres, writes two files to EXPORT_DIR:
 *   error-report.md  — Claude-Code-friendly grouped report
 *   errors.json      — raw structured data
 *
 * Falls back to scanning JSONL files in LOG_DIR if the DB is unavailable.
 * Respects LOG_RETENTION_DAYS when reading fallback files.
 */

import "dotenv/config";
import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

const EXPORT_DIR   = resolve(process.env.EXPORT_DIR   ?? "./exports");
const LOG_DIR      = resolve(process.env.LOG_DIR      ?? "./logs");
const RETAIN_DAYS  = parseInt(process.env.LOG_RETENTION_DAYS ?? "14", 10);
const TOP_N        = 200; // max rows to export

mkdirSync(EXPORT_DIR, { recursive: true });

// ── Types ────────────────────────────────────────────────────────────────────

interface ErrorRow {
  id: string;
  fingerprint: string;
  source: string;
  level: string;
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
  breadcrumbs?: unknown;
  userAgent?: string | null;
  appVersion?: string | null;
  count: number;
  firstSeenAt: Date | string;
  lastSeenAt: Date | string;
  status: string;
}

// ── DB fetch ──────────────────────────────────────────────────────────────────

async function fetchFromDb(): Promise<ErrorRow[]> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.errorLog.findMany({
      where: { status: { not: "IGNORED" } },
      orderBy: { count: "desc" },
      take: TOP_N,
    });
    return rows as ErrorRow[];
  } finally {
    await prisma.$disconnect();
  }
}

// ── JSONL fallback ───────────────────────────────────────────────────────────

function fetchFromJsonl(): ErrorRow[] {
  const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
  const grouped = new Map<string, ErrorRow>();

  let files: string[];
  try {
    files = readdirSync(LOG_DIR).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return [];
  }

  for (const name of files) {
    const p = join(LOG_DIR, name);
    try {
      if (statSync(p).mtimeMs < cutoff) continue;
      const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const ev = JSON.parse(line) as Partial<ErrorRow>;
          const fp =
            ev.fingerprint ??
            createHash("sha1")
              .update(`${ev.level}|${ev.message}|${ev.route ?? ""}`)
              .digest("hex");
          const existing = grouped.get(fp);
          if (existing) {
            existing.count += 1;
            existing.lastSeenAt = ev.lastSeenAt ?? new Date().toISOString();
          } else {
            grouped.set(fp, {
              id: fp,
              fingerprint: fp,
              source: ev.source ?? "SERVER",
              level: ev.level ?? "ERROR",
              message: ev.message ?? "",
              stack: ev.stack,
              route: ev.route,
              httpMethod: ev.httpMethod,
              httpStatus: ev.httpStatus,
              requestPath: ev.requestPath,
              component: ev.component,
              elementLabel: ev.elementLabel,
              elementSelector: ev.elementSelector,
              userRole: ev.userRole,
              breadcrumbs: ev.breadcrumbs,
              userAgent: ev.userAgent,
              appVersion: ev.appVersion,
              count: 1,
              firstSeenAt: ev.firstSeenAt ?? new Date().toISOString(),
              lastSeenAt:  ev.lastSeenAt  ?? new Date().toISOString(),
              status: "OPEN",
            });
          }
        } catch {}
      }
    } catch {}
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count).slice(0, TOP_N);
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function fmtDate(d: Date | string): string {
  return new Date(d).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function trimStack(stack: string | null | undefined): string {
  if (!stack) return "";
  return stack.split("\n").slice(0, 8).join("\n");
}

function breadcrumbSummary(bc: unknown): string {
  if (!Array.isArray(bc) || bc.length === 0) return "_none_";
  return bc
    .map((b: Record<string, unknown>) => {
      if (b.type === "click")   return `click "${b.label}"`;
      if (b.type === "nav")     return `nav → ${b.url}`;
      if (b.type === "fetch")   return `fetch ${b.url} (${b.status ?? "?"})`;
      if (b.type === "console") return `console.error: ${b.msg}`;
      return JSON.stringify(b);
    })
    .join(" → ");
}

function likelyCause(row: ErrorRow): string {
  const m = row.message.toLowerCase();
  if (row.httpStatus === 401) return "User session expired or missing.";
  if (row.httpStatus === 403) return "Insufficient permissions for this action.";
  if (row.httpStatus === 404) return "Resource not found — stale link or deleted record.";
  if (row.httpStatus === 429) return "Rate limit or tier cap hit.";
  if (row.httpStatus === 500) return "Unhandled server exception — check stack + server logs.";
  if (row.level === "DEAD_CLICK") return `Button/link "${row.elementLabel}" has no handler wired up.`;
  if (m.includes("network") || m.includes("failed to fetch")) return "Network failure — check connectivity or CORS config.";
  if (m.includes("prisma") || m.includes("unique constraint")) return "Database constraint violation.";
  if (m.includes("cannot read") || m.includes("undefined")) return "Null/undefined dereference — likely missing guard.";
  if (m.includes("json")) return "Malformed JSON response from API.";
  if (row.stack?.includes("node_modules/next")) return "Next.js internal — likely a rendering or hydration error.";
  return "";
}

function buildMarkdown(rows: ErrorRow[], source: string): string {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const byLevel: Record<string, number> = {};
  const bySrc:   Record<string, number> = {};
  for (const r of rows) {
    byLevel[r.level]  = (byLevel[r.level]  ?? 0) + r.count;
    bySrc[r.source]   = (bySrc[r.source]   ?? 0) + r.count;
  }

  const top10 = rows.slice(0, 10);

  const lines: string[] = [
    "# Xplosale Error Report",
    "",
    `**Generated:** ${new Date().toISOString()}  `,
    `**Source:** ${source}  `,
    `**Unique errors:** ${rows.length}  `,
    `**Total occurrences:** ${total}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    ...Object.entries(byLevel).map(([k, v]) => `| ${k} | ${v} |`),
    ...Object.entries(bySrc).map(([k, v]) => `| Source: ${k} | ${v} |`),
    "",
    "### Top 10 by occurrence",
    "",
    "| # | Message | Level | Count | Route |",
    "|---|---------|-------|-------|-------|",
    ...top10.map((r, i) =>
      `| ${i + 1} | ${r.message.slice(0, 60).replace(/\|/g, "/")} | ${r.level} | ${r.count} | ${r.route ?? "-"} |`
    ),
    "",
    "---",
    "",
    "## Errors (sorted by count)",
    "",
  ];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cause = likelyCause(r);
    lines.push(
      `### ${i + 1}. ${r.message.slice(0, 120)}`,
      "",
      `**Level:** ${r.level} | **Source:** ${r.source} | **Count:** ${r.count} | **Status:** ${r.status}  `,
      `**First seen:** ${fmtDate(r.firstSeenAt)} | **Last seen:** ${fmtDate(r.lastSeenAt)}  `,
      r.route        ? `**Route:** \`${r.route}\`  ` : "",
      r.httpMethod   ? `**HTTP:** \`${r.httpMethod} ${r.requestPath ?? r.route ?? ""}\` → ${r.httpStatus ?? "?"}  ` : "",
      r.component    ? `**Component:** \`${r.component}\`  ` : "",
      r.userRole     ? `**User role:** ${r.userRole}  ` : "",
      r.appVersion   ? `**App version:** ${r.appVersion}  ` : "",
      "",
    );
    if (cause) {
      lines.push(`**Likely cause:** ${cause}`, "");
    }
    if (r.level === "DEAD_CLICK") {
      lines.push(
        `**Element:** \`${r.elementLabel}\`  `,
        `**Selector:** \`${r.elementSelector}\`  `,
        "",
      );
    }
    if (r.breadcrumbs) {
      lines.push(
        "**Breadcrumbs:**",
        "```",
        breadcrumbSummary(r.breadcrumbs),
        "```",
        "",
      );
    }
    if (r.stack) {
      lines.push(
        "**Stack:**",
        "```",
        trimStack(r.stack),
        "```",
        "",
      );
    }
    lines.push("---", "");
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[errors:export] Starting…");

  let rows: ErrorRow[];
  let source: string;

  try {
    rows = await fetchFromDb();
    source = "Postgres ErrorLog";
    console.log(`[errors:export] Fetched ${rows.length} rows from DB`);
  } catch (e) {
    console.warn("[errors:export] DB unavailable, falling back to JSONL files:", (e as Error).message);
    rows = fetchFromJsonl();
    source = `JSONL files in ${LOG_DIR}`;
    console.log(`[errors:export] Aggregated ${rows.length} unique errors from JSONL`);
  }

  if (rows.length === 0) {
    console.log("[errors:export] No errors to export.");
    return;
  }

  const md   = buildMarkdown(rows, source);
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), source, count: rows.length, errors: rows }, null, 2);

  const mdPath   = join(EXPORT_DIR, "error-report.md");
  const jsonPath = join(EXPORT_DIR, "errors.json");

  writeFileSync(mdPath,   md,   "utf8");
  writeFileSync(jsonPath, json, "utf8");

  console.log(`[errors:export] ✅ Wrote ${mdPath}`);
  console.log(`[errors:export] ✅ Wrote ${jsonPath}`);
}

main().catch((e) => {
  console.error("[errors:export] Fatal:", e);
  process.exit(1);
});
