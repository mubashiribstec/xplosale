-- Remove the Network feature (professional profiles, posts, connections, endorsements)
-- and add seller contact/address fields to User for marketplace use.

DROP TABLE IF EXISTS "PostComment", "PostLike", "Post", "Endorsement", "ProfileSkill", "Experience", "Education", "Skill", "Connection", "NetworkProfile" CASCADE;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "secondaryPhone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressLine" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stateProvince" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "postcode" TEXT;
