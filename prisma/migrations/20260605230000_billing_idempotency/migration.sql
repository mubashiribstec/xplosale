-- Webhook idempotency: track processed event IDs to prevent duplicate billing
CREATE TABLE IF NOT EXISTS "ProcessedWebhookEvent" (
  "id"          TEXT NOT NULL,
  "eventId"     TEXT NOT NULL,
  "provider"    TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProcessedWebhookEvent_eventId_key" ON "ProcessedWebhookEvent" ("eventId");
CREATE INDEX IF NOT EXISTS "ProcessedWebhookEvent_processedAt_idx" ON "ProcessedWebhookEvent" ("processedAt");
