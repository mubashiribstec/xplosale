/**
 * Next.js instrumentation hook — called once at server startup.
 * Only Node.js runtime: initialises Pino disk logger and installs
 * process-level exception handlers so crashes are captured before the
 * process manager (PM2/Docker/systemd) restarts the app.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initLogger } = await import("@/lib/logger.server");
  await initLogger();

  const { logError } = await import("@/lib/log-error");

  process.on("uncaughtException", (err: Error) => {
    logError({
      source:  "SERVER",
      level:   "ERROR",
      message: err.message ?? String(err),
      stack:   err.stack,
      route:   "process:uncaughtException",
    }).finally(() => {
      // Let the process manager restart after a brief flush window
      setTimeout(() => process.exit(1), 500).unref();
    });
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logError({
      source:  "SERVER",
      level:   "ERROR",
      message: err.message,
      stack:   err.stack,
      route:   "process:unhandledRejection",
    });
  });
}
