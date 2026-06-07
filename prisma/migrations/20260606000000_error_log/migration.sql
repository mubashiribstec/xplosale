-- Error capture system: grouped error log with fingerprint deduplication

CREATE TYPE "ErrorSource" AS ENUM ('CLIENT', 'SERVER');
CREATE TYPE "ErrorLevel"  AS ENUM ('ERROR', 'WARN', 'DEAD_CLICK');
CREATE TYPE "ErrorStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

CREATE TABLE "ErrorLog" (
  "id"              TEXT NOT NULL,
  "fingerprint"     TEXT NOT NULL,
  "source"          "ErrorSource" NOT NULL,
  "level"           "ErrorLevel"  NOT NULL DEFAULT 'ERROR',
  "message"         TEXT NOT NULL,
  "stack"           TEXT,
  "route"           TEXT,
  "httpMethod"      TEXT,
  "httpStatus"      INTEGER,
  "requestPath"     TEXT,
  "component"       TEXT,
  "elementLabel"    TEXT,
  "elementSelector" TEXT,
  "userRole"        TEXT,
  "sessionHash"     TEXT,
  "breadcrumbs"     JSONB,
  "userAgent"       TEXT,
  "appVersion"      TEXT,
  "count"           INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status"          "ErrorStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ErrorLog_fingerprint_key" ON "ErrorLog" ("fingerprint");
CREATE INDEX "ErrorLog_status_level_lastSeenAt_idx" ON "ErrorLog" ("status", "level", "lastSeenAt" DESC);
CREATE INDEX "ErrorLog_route_idx" ON "ErrorLog" ("route");
CREATE INDEX "ErrorLog_lastSeenAt_idx" ON "ErrorLog" ("lastSeenAt" DESC);
