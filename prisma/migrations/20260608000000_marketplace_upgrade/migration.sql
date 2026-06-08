-- Marketplace upgrade: new fields, new models, new enums

-- ── Listing: new fields ──────────────────────────────────────────────────────
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "condition"         TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "negotiable"        BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "urgent"            BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "sellerType"        TEXT    NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryAvailable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "deliveryCost"      DECIMAL(65,30);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "viewCount"         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "savedCount"        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "contactCount"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "renewedAt"         TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "bumpedAt"          TIMESTAMP(3);

-- ── Listing: new index ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "Listing_status_bumpedAt_idx" ON "Listing"("status", "bumpedAt");

-- ── SellerProfile: new fields ────────────────────────────────────────────────
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "sellerRatingAvg"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "sellerRatingCount" INTEGER          NOT NULL DEFAULT 0;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "responseRate"      DOUBLE PRECISION;
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "lastActiveAt"      TIMESTAMP(3);
ALTER TABLE "SellerProfile" ADD COLUMN IF NOT EXISTS "badges"            TEXT[]           NOT NULL DEFAULT '{}';

-- ── New enums ────────────────────────────────────────────────────────────────
ALTER TYPE "EmailSendProvider"   ADD VALUE IF NOT EXISTS 'SMTP';
ALTER TYPE "NotificationKind"    ADD VALUE IF NOT EXISTS 'PRICE_DROP';

DO $$ BEGIN
  CREATE TYPE "ReportReason" AS ENUM ('SPAM','FRAUD','MISLEADING','PROHIBITED','DUPLICATE','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── SellerReview ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SellerReview" (
  "id"              TEXT         NOT NULL,
  "sellerProfileId" TEXT         NOT NULL,
  "authorId"        TEXT         NOT NULL,
  "rating"          INTEGER      NOT NULL,
  "body"            VARCHAR(1000),
  "transactionRef"  TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SellerReview_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_sellerProfileId_fkey"
  FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "SellerReview_sellerProfileId_authorId_transactionRef_key"
  ON "SellerReview"("sellerProfileId", "authorId", "transactionRef");

-- ── SavedListing ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SavedListing" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "listingId" TEXT         NOT NULL,
  "savedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "SavedListing_userId_listingId_key" ON "SavedListing"("userId", "listingId");
CREATE INDEX IF NOT EXISTS "SavedListing_userId_savedAt_idx" ON "SavedListing"("userId", "savedAt");

-- ── ListingQuestion ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ListingQuestion" (
  "id"         TEXT         NOT NULL,
  "listingId"  TEXT         NOT NULL,
  "askerId"    TEXT         NOT NULL,
  "question"   VARCHAR(500) NOT NULL,
  "answer"     VARCHAR(1000),
  "answeredAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingQuestion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ListingQuestion" ADD CONSTRAINT "ListingQuestion_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingQuestion" ADD CONSTRAINT "ListingQuestion_askerId_fkey"
  FOREIGN KEY ("askerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ListingQuestion_listingId_createdAt_idx" ON "ListingQuestion"("listingId", "createdAt");

-- ── ListingReport ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ListingReport" (
  "id"         TEXT            NOT NULL,
  "listingId"  TEXT            NOT NULL,
  "reporterId" TEXT            NOT NULL,
  "reason"     "ReportReason"  NOT NULL,
  "details"    VARCHAR(500),
  "resolved"   BOOLEAN         NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingReport_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingReport" ADD CONSTRAINT "ListingReport_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS "ListingReport_listingId_reporterId_key" ON "ListingReport"("listingId", "reporterId");
CREATE INDEX IF NOT EXISTS "ListingReport_resolved_createdAt_idx" ON "ListingReport"("resolved", "createdAt");

-- ── ListingPriceHistory ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ListingPriceHistory" (
  "id"        TEXT         NOT NULL,
  "listingId" TEXT         NOT NULL,
  "oldPrice"  DECIMAL(65,30) NOT NULL,
  "newPrice"  DECIMAL(65,30) NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingPriceHistory_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ListingPriceHistory" ADD CONSTRAINT "ListingPriceHistory_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "ListingPriceHistory_listingId_changedAt_idx" ON "ListingPriceHistory"("listingId", "changedAt");
