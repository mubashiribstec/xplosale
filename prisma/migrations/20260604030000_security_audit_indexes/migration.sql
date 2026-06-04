-- Security audit: additional indexes for high-traffic query paths

-- User role lookups (admin queue, bootstrap check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_role_idx" ON "User"("role");

-- User ban status checks (middleware fallback, admin queue)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_bannedAt_idx" ON "User"("bannedAt")
  WHERE "bannedAt" IS NOT NULL;

-- User verification queue (admin verification panel)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_verificationStatus_idx" ON "User"("verificationStatus");

-- User creation time (admin user list, pagination)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- Listing seller + status compound (my listings page, tier limit count)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Listing_sellerProfileId_status_idx"
  ON "Listing"("sellerProfileId", "status");

-- EscrowTransaction buyer+listing (review eligibility check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "EscrowTransaction_buyerId_listingId_idx"
  ON "EscrowTransaction"("buyerId", "listingId");

-- Application count per job seeker (daily apply limit check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Application_jobSeekerId_createdAt_idx"
  ON "Application"("jobSeekerId", "createdAt");

-- ChatRoom fast participant lookup (O(1) room auth check)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ChatRoom_participantAId_participantBId_idx"
  ON "ChatRoom"("participantAId", "participantBId");
