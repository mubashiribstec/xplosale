-- Partner suspension: track when a PARTNER account was suspended back to USER

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "partnerSuspendedAt" TIMESTAMP(3);
