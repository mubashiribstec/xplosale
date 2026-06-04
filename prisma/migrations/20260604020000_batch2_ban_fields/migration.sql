-- Batch 2: Auth lifecycle — ban reason, timed bans, lastSeen tracking
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason"   TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSeenAt"  TIMESTAMP(3);
