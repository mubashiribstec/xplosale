"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  firstSeenAt: string;
  lastSeenAt: string;
  status: string;
}

interface Props {
  errors: ErrorRow[];
  total: number;
  page: number;
  pages: number;
}

// ── Badges ────────────────────────────────────────────────────────────────────

const levelBadge: Record<string, string> = {
  ERROR:      "bg-red-100 text-red-700",
  WARN:       "bg-yellow-100 text-yellow-700",
  DEAD_CLICK: "bg-gray-100 text-gray-600",
};

const sourceBadge: Record<string, string> = {
  CLIENT: "bg-blue-100 text-blue-700",
  SERVER: "bg-purple-100 text-purple-700",
};

const statusBadge: Record<string, string> = {
  OPEN:     "bg-red-50 text-red-600",
  RESOLVED: "bg-green-50 text-green-700",
  IGNORED:  "bg-gray-50 text-gray-500",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)    return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function breadcrumbTrail(bc: unknown): string {
  if (!Array.isArray(bc) || bc.length === 0) return "";
  return bc
    .map((b: Record<string, unknown>) => {
      if (b.type === "click")   return `click "${b.label}"`;
      if (b.type === "nav")     return `→ ${b.url}`;
      if (b.type === "fetch")   return `fetch ${b.status ?? "?"} ${b.url}`;
      if (b.type === "console") return `⚠ ${b.msg}`;
      return "";
    })
    .filter(Boolean)
    .join("  ·  ");
}

// ── Expanded detail panel ─────────────────────────────────────────────────────

function ExpandedRow({ row }: { row: ErrorRow }) {
  return (
    <div className="bg-gray-50 border-t border-gray-100 px-6 py-5 space-y-4 text-sm">
      {/* Meta grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {row.httpMethod && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">HTTP</div>
            <div className="font-mono text-gray-700">
              {row.httpMethod} {row.requestPath ?? row.route ?? "—"} → {row.httpStatus ?? "?"}
            </div>
          </div>
        )}
        {row.component && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Component</div>
            <div className="font-mono text-gray-700 truncate">{row.component}</div>
          </div>
        )}
        {row.userRole && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">User role</div>
            <div className="text-gray-700">{row.userRole}</div>
          </div>
        )}
        {row.appVersion && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">App version</div>
            <div className="text-gray-700">{row.appVersion}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">First seen</div>
          <div className="text-gray-700">{new Date(row.firstSeenAt).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Fingerprint</div>
          <div className="font-mono text-gray-400 text-xs truncate">{row.fingerprint}</div>
        </div>
      </div>

      {/* Dead-click element info */}
      {row.level === "DEAD_CLICK" && (row.elementLabel || row.elementSelector) && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Element</div>
          <div className="font-mono text-xs bg-white border border-gray-200 rounded p-2 text-gray-700">
            {row.elementLabel && <div>Label: {row.elementLabel}</div>}
            {row.elementSelector && <div>Selector: {row.elementSelector}</div>}
          </div>
        </div>
      )}

      {/* Breadcrumbs */}
      {Array.isArray(row.breadcrumbs) && row.breadcrumbs.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Breadcrumbs</div>
          <div className="font-mono text-xs bg-white border border-gray-200 rounded p-2 text-gray-600 leading-5 break-words">
            {breadcrumbTrail(row.breadcrumbs)}
          </div>
        </div>
      )}

      {/* Stack trace */}
      {row.stack && (
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Stack</div>
          <pre className="text-xs bg-gray-900 text-green-300 rounded p-3 overflow-x-auto max-h-52 leading-5 whitespace-pre-wrap break-words">
            {row.stack.split("\n").slice(0, 12).join("\n")}
          </pre>
        </div>
      )}

      {/* User agent */}
      {row.userAgent && (
        <div className="text-xs text-gray-400 truncate">UA: {row.userAgent}</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminErrorsTable({ errors, total, page, pages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<string, string>>({});

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) { params.set(key, value); } else { params.delete(key); }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  async function setStatus(id: string, status: string) {
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/errors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLocalStatus((prev) => ({ ...prev, [id]: status }));
      }
    } finally {
      setSaving(null);
    }
  }

  const currentLevel  = searchParams.get("level")  ?? "";
  const currentSource = searchParams.get("source") ?? "";
  const currentStatus = searchParams.get("status") ?? "OPEN";
  const currentRoute  = searchParams.get("route")  ?? "";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        {/* Status */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
          <select
            value={currentStatus}
            onChange={(e) => updateParam("status", e.target.value)}
            className="block w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
            <option value="">All</option>
          </select>
        </div>

        {/* Level */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Level</label>
          <select
            value={currentLevel}
            onChange={(e) => updateParam("level", e.target.value)}
            className="block w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">All</option>
            <option value="ERROR">Error</option>
            <option value="WARN">Warn</option>
            <option value="DEAD_CLICK">Dead click</option>
          </select>
        </div>

        {/* Source */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</label>
          <select
            value={currentSource}
            onChange={(e) => updateParam("source", e.target.value)}
            className="block w-32 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">All</option>
            <option value="CLIENT">Client</option>
            <option value="SERVER">Server</option>
          </select>
        </div>

        {/* Route */}
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Route</label>
          <input
            type="text"
            placeholder="/admin, /api/..."
            value={currentRoute}
            onChange={(e) => updateParam("route", e.target.value)}
            className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        <div className="text-sm text-gray-400 self-end pb-2">
          {total} error{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {errors.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No errors match these filters.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-6"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Level</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Source</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">Count</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32 hidden md:table-cell">Last seen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {errors.map((row) => {
                const status = localStatus[row.id] ?? row.status;
                const isExpanded = expanded.has(row.id);
                const isSaving = saving === row.id;

                return (
                  <>
                    <tr
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(row.id)}
                    >
                      {/* Expand caret */}
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {isExpanded ? "▼" : "▶"}
                      </td>

                      {/* Message */}
                      <td className="px-4 py-3 max-w-0">
                        <div className="truncate text-gray-800 font-medium" title={row.message}>
                          {row.message.slice(0, 120)}
                        </div>
                        {row.route && (
                          <div className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                            {row.route}
                          </div>
                        )}
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${levelBadge[row.level] ?? "bg-gray-100 text-gray-600"}`}>
                          {row.level}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sourceBadge[row.source] ?? "bg-gray-100 text-gray-600"}`}>
                          {row.source}
                        </span>
                      </td>

                      {/* Count */}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-700">
                        {row.count.toLocaleString()}
                      </td>

                      {/* Last seen */}
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {relTime(row.lastSeenAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge[status] ?? "bg-gray-50 text-gray-500"}`}>
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1.5">
                          {status !== "RESOLVED" && (
                            <button
                              disabled={isSaving}
                              onClick={() => setStatus(row.id, "RESOLVED")}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          {status !== "IGNORED" && (
                            <button
                              disabled={isSaving}
                              onClick={() => setStatus(row.id, "IGNORED")}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            >
                              Ignore
                            </button>
                          )}
                          {status !== "OPEN" && (
                            <button
                              disabled={isSaving}
                              onClick={() => setStatus(row.id, "OPEN")}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${row.id}-expanded`}>
                        <td colSpan={8} className="p-0">
                          <ExpandedRow row={{ ...row, status }} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <button
                onClick={() => updateParam("page", String(page - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                ← Prev
              </button>
            )}
            {page < pages && (
              <button
                onClick={() => updateParam("page", String(page + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
