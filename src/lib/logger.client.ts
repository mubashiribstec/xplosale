/**
 * Client-side error capture.
 * - Installs window.onerror, unhandledrejection, console.error patch
 * - Dead-click heuristic (1 s watch after interactive-element click)
 * - Fetch monkey-patch captures non-2xx responses + network failures
 * - Breadcrumb ring-buffer (last 10 events)
 * - Batch queue flushed every 3 s or on visibilitychange (sendBeacon)
 * Never throws; degrades silently on any error.
 */

"use client";

export interface ClientEvent {
  source: "CLIENT";
  level: "ERROR" | "WARN" | "DEAD_CLICK";
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
  breadcrumbs?: unknown[];
  userAgent?: string | null;
  appVersion?: string | null;
}

type Breadcrumb =
  | { type: "click";    label: string; time: number }
  | { type: "nav";      url: string;   time: number }
  | { type: "fetch";    url: string;   status: number; time: number }
  | { type: "console";  msg: string;   time: number };

const MAX_BREADCRUMBS = 10;
const FLUSH_INTERVAL_MS = 3_000;
const MAX_QUEUE = 50;

const breadcrumbs: Breadcrumb[] = [];
const queue: ClientEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let activeFetches = 0;
let initialized = false;

function pushBreadcrumb(b: Breadcrumb) {
  breadcrumbs.push(b);
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();
}

function getAppVersion(): string {
  return (
    (typeof window !== "undefined" && (window as { __APP_VERSION__?: string }).__APP_VERSION__) ||
    "unknown"
  );
}

function capture(ev: Omit<ClientEvent, "source" | "breadcrumbs" | "userAgent" | "appVersion">) {
  if (queue.length >= MAX_QUEUE) return;
  queue.push({
    source: "CLIENT",
    breadcrumbs: [...breadcrumbs],
    userAgent: navigator.userAgent.slice(0, 300),
    appVersion: getAppVersion(),
    route: window.location.pathname,
    ...ev,
  });
}

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 20);
  const payload = JSON.stringify({ events: batch });
  try {
    if (document.visibilityState === "hidden" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/log", new Blob([payload], { type: "application/json" }));
    } else {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

// ── Fetch patch ──────────────────────────────────────────────────────────────

function patchFetch() {
  const _fetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : (input as Request).url;
    const method = init?.method ?? "GET";

    // Don't intercept our own log endpoint (infinite loop guard)
    if (url.includes("/api/log")) return _fetch(input, init);

    activeFetches++;
    pushBreadcrumb({ type: "fetch", url: url.slice(0, 200), status: 0, time: Date.now() });

    try {
      const res = await _fetch(input, init);
      activeFetches--;
      pushBreadcrumb({ type: "fetch", url: url.slice(0, 200), status: res.status, time: Date.now() });

      if (!res.ok) {
        capture({
          level: "WARN",
          message: `${method} ${url} → ${res.status}`,
          httpMethod: method,
          httpStatus: res.status,
          requestPath: url.slice(0, 300),
        });
      }
      return res;
    } catch (err) {
      activeFetches--;
      capture({
        level: "ERROR",
        message: `Network failure: ${method} ${url}`,
        stack: err instanceof Error ? err.stack : undefined,
        httpMethod: method,
        requestPath: url.slice(0, 300),
      });
      throw err;
    }
  };
}

// ── Dead-click heuristic ─────────────────────────────────────────────────────

function elementSelector(el: Element): string {
  const parts: string[] = [el.tagName.toLowerCase()];
  if (el.id) parts.push(`#${el.id}`);
  const cls = Array.from(el.classList).slice(0, 3).join(".");
  if (cls) parts.push(`.${cls}`);
  return parts.join("").slice(0, 200);
}

function watchDeadClick(el: Element, label: string) {
  const urlBefore = window.location.href;
  const domMarker = document.body.childElementCount;
  const fetchsBefore = activeFetches;

  setTimeout(() => {
    try {
      const urlChanged = window.location.href !== urlBefore;
      const domChanged = document.body.childElementCount !== domMarker;
      const fetchHappened = activeFetches !== fetchsBefore;
      if (!urlChanged && !domChanged && !fetchHappened) {
        capture({
          level: "DEAD_CLICK",
          message: `Dead click: "${label.slice(0, 100)}"`,
          elementLabel: label.slice(0, 200),
          elementSelector: elementSelector(el),
        });
      }
    } catch {}
  }, 1000);
}

function installDeadClickWatcher() {
  document.addEventListener("click", (e) => {
    try {
      const target = (e.target as Element).closest("button, a, [role='button']");
      if (!target) return;
      const label =
        target.getAttribute("aria-label") ||
        (target as HTMLElement).innerText?.trim().slice(0, 100) ||
        target.tagName;
      pushBreadcrumb({ type: "click", label: label.slice(0, 100), time: Date.now() });
      watchDeadClick(target, label);
    } catch {}
  }, { capture: true, passive: true });
}

// ── Navigation tracking ──────────────────────────────────────────────────────

function installNavTracker() {
  const push = (url: string) =>
    pushBreadcrumb({ type: "nav", url: url.slice(0, 200), time: Date.now() });

  push(window.location.pathname);
  window.addEventListener("popstate", () => push(window.location.pathname), { passive: true });

  // Next.js App Router: intercept History API
  const _pushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    _pushState(...args);
    push(window.location.pathname);
  };
}

// ── console.error patch ──────────────────────────────────────────────────────

function patchConsoleError() {
  const _error = console.error.bind(console);
  console.error = function (...args: unknown[]) {
    _error(...args);
    try {
      const msg = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
      const stack = args.find((a) => a instanceof Error)?.stack;
      pushBreadcrumb({ type: "console", msg: msg.slice(0, 100), time: Date.now() });
      capture({ level: "ERROR", message: msg.slice(0, 500), stack });
    } catch {}
  };
}

// ── Global error handlers ────────────────────────────────────────────────────

function installGlobalHandlers() {
  window.onerror = (_msg, source, _line, _col, err) => {
    capture({
      level: "ERROR",
      message: err?.message ?? String(_msg),
      stack: err?.stack,
      component: source,
    });
    return false; // Don't suppress default error handling
  };

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    capture({
      level: "ERROR",
      message: reason instanceof Error ? reason.message : String(reason ?? "Unhandled rejection"),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  }, { passive: true });
}

// ── Public API ───────────────────────────────────────────────────────────────

export function captureError(err: Error, component?: string) {
  capture({ level: "ERROR", message: err.message, stack: err.stack, component });
}

export function captureWarn(message: string) {
  capture({ level: "WARN", message });
}

export function initClientLogger(userRole?: string | null) {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    patchFetch();
    installDeadClickWatcher();
    installNavTracker();
    patchConsoleError();
    installGlobalHandlers();

    // Store role for subsequent captures
    if (userRole) {
      const _capture = capture;
      // Wrap capture to inject role
      (window as { __xplogRole?: string }).__xplogRole = userRole;
    }

    // Periodic flush
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    // Flush on tab hide (sendBeacon path)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    }, { passive: true });

  } catch {}
}
