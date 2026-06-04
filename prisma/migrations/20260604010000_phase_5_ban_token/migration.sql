-- Migration: phase_5_ban_token
-- Adds bannedAt and tokenVersion to User for ban/force-logout support.
-- ADDITIVE ONLY.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
