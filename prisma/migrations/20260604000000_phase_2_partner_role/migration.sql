-- Migration: phase_2_partner_role
-- Adds PARTNER role, hasVerifiedBadge field, and migrates all EMPLOYER* users.
-- ADDITIVE DATA MIGRATION — no tables dropped.

-- 1. Add PARTNER to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARTNER';

-- 2. Add hasVerifiedBadge column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasVerifiedBadge" BOOLEAN NOT NULL DEFAULT false;

-- 3. Back-fill verified badge for already-verified users
UPDATE "User"
SET "hasVerifiedBadge" = true
WHERE "verificationStatus" = 'VERIFIED';

-- 4. Migrate all EMPLOYER* users to PARTNER role and set isPartner=true
-- (runs after step 1 so PARTNER is a valid value)
UPDATE "User"
SET role = 'PARTNER', "isPartner" = true
WHERE role IN ('EMPLOYER', 'EMPLOYER_RECRUITER', 'EMPLOYER_HIRING_MANAGER', 'EMPLOYER_INTERVIEWER');
