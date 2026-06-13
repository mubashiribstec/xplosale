/**
 * GET /api/admin/errors/export?format=md|json
 * ADMIN only. Streams error-report.md or errors.json as a download.
 * Generates on-demand from Postgres — no file I/O required on the server.
 */

import { type NextRequest, NextResponse } from "next/server";
import { err, parseError } from "@/lib/http";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const TOP_N = 200;

interface ErrorRow {
  id: string;
  fingerprint: string;
  source: string;
  level: string;
  message: string;
  stack: string | null;
  route: string | null;
  httpMethod: string | null;
  httpStatus: number | null;
  requestPath: string | null;
  component: string | null;
  elementLabel: string | null;
  elementSelector: string | null;
  userRole: string | null;
  breadcrumbs: unknown;
  userAgent: string | null;
  appVersion: string | null;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  status: string;
}

function fmtDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function trimStack(s: string | null): string {
  return s?.split("\n").slice(0, 8).join("\n") ?? "";
}

function breadcrumbSummary(bc: unknown): string {
  if (!Array.isArray(bc) || bc.length === 0) return "none";
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

function likelyCause(r: ErrorRow): string {
  const m = r.message.toLowerCase();
  if (r.httpStatus === 401) return "User session expired or missing.";
  if (r.httpStatus === 403) return "Insufficient permissions for this action.";
  if (r.httpStatus === 404) return "Resource not found — stale link or deleted record.";
  if (r.httpStatus === 429) return "Rate limit or tier cap hit.";
  if (r.httpStatus === 500) return "Unhandled server exception — check stack + server logs.";
  if (r.level === "DEAD_CLICK") return `Button/link "${r.elementLabel}" has no handler wired up.`;
  if (m.includes("network") || m.includes("failed to fetch")) return "Network failure — check connectivity or CORS.";
  if (m.includes("prisma") || m.includes("unique constraint")) return "Database constraint violation.";
  if (m.includes("cannot read") || m.includes("undefined")) return "Null/undefined dereference.";
  return "";
}

function buildMarkdown(rows: ErrorRow[]): string {
  const total = rows.reduce((s, r) => s + r.count, 0);
  const byLevel: Record<string, number> = {};
  const bySrc:   Record<string, number> = {};
  for (const r of rows) {
    byLevel[r.level]  = (byLevel[r.level]  ?? 0) + r.count;
    bySrc[r.source]   = (bySrc[r.source]   ?? 0) + r.count;
  }

  const lines: string[] = [
    "# Xplosale Error Report",
    "",
    `**Generated:** ${new Date().toISOString()}  `,
    `**Unique errors:** ${rows.length} | **Total occurrences:** ${total}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    ...Object.entries(byLevel).map(([k, v]) => `| ${k} | ${v} |`),
    ...Object.entries(bySrc).map(([k, v])   => `| Source: ${k} | ${v} |`),
    "",
    "### Top 10 by count",
    "",
    "| # | Message | Level | Count | Route |",
    "|---|---------|-------|-------|-------|",
    ...rows.slice(0, 10).map((r, i) =>
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
      r.route      ? `**Route:** \`${r.route}\`  ` : "",
      r.httpMethod ? `**HTTP:** \`${r.httpMethod} ${r.requestPath ?? r.route ?? ""}\` → ${r.httpStatus ?? "?"}  ` : "",
      r.component  ? `**Component:** \`${r.component}\`  ` : "",
      r.userRole   ? `**User role:** ${r.userRole}  ` : "",
      "",
    );
    if (cause) lines.push(`**Likely cause:** ${cause}`, "");
    if (r.level === "DEAD_CLICK") {
      lines.push(`**Element:** \`${r.elementLabel}\` | **Selector:** \`${r.elementSelector}\``, "");
    }
    if (r.breadcrumbs) {
      lines.push("**Breadcrumbs:**", "```", breadcrumbSummary(r.breadcrumbs), "```", "");
    }
    if (r.stack) {
      lines.push("**Stack:**", "```", trimStack(r.stack), "```", "");
    }
    lines.push("---", "");
  }

  return lines.join("\n");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return err("Unauthorized", 401);
    const role = (session.user as { role: string }).role;
    if (role !== "ADMIN") return err("Forbidden", 403);

    const format = req.nextUrl.searchParams.get("format") === "json" ? "json" : "md";

    const rows = await prisma.errorLog.findMany({
      where: { status: { not: "IGNORED" } },
      orderBy: { count: "desc" },
      take: TOP_N,
    }) as ErrorRow[];

    if (format === "json") {
      const body = JSON.stringify(
        { exportedAt: new Date().toISOString(), count: rows.length, errors: rows },
        null,
        2
      );
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="errors-${Date.now()}.json"`,
        },
      });
    }

    const md = buildMarkdown(rows);
    return new NextResponse(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="error-report-${Date.now()}.md"`,
      },
    });
  } catch (e) {
    return parseError(e);
  }
}
