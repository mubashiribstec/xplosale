-- Shop commerce upgrade: orders, reports, reviews, favourites, 3-tier plans

-- ── Enums ────────────────────────────────────────────────────────────────────

ALTER TYPE "PlanKey"      ADD VALUE IF NOT EXISTS 'PROMOTION';
ALTER TYPE "ChatContext"  ADD VALUE IF NOT EXISTS 'SHOP_INQUIRY';

CREATE TYPE "OrderDelivery"    AS ENUM ('PICKUP', 'DELIVERY');
CREATE TYPE "OrderPayment"     AS ENUM ('CASH', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA');
CREATE TYPE "OrderStatus"      AS ENUM ('PENDING', 'PAYMENT_SUBMITTED', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ShopReportReason" AS ENUM ('FRAUD', 'FAKE_PRODUCTS', 'MISLEADING', 'INAPPROPRIATE', 'SPAM', 'OTHER');
CREATE TYPE "ShopReportStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CLOSED_ACTION', 'CLOSED_NO_ACTION');

-- ── Shop — payment & delivery fields ─────────────────────────────────────────

ALTER TABLE "Shop"
  ADD COLUMN IF NOT EXISTS "bankName"          TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountTitle"  TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "jazzcashNumber"    TEXT,
  ADD COLUMN IF NOT EXISTS "easipaisaNumber"   TEXT,
  ADD COLUMN IF NOT EXISTS "acceptsCash"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "acceptsDelivery"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deliveryNotes"     TEXT,
  ADD COLUMN IF NOT EXISTS "workingHours"      JSONB;

-- ── ShopProduct — stock fields ────────────────────────────────────────────────

ALTER TABLE "ShopProduct"
  ADD COLUMN IF NOT EXISTS "inStock"    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "stockCount" INTEGER;

-- ── ShopOrder ────────────────────────────────────────────────────────────────

CREATE TABLE "ShopOrder" (
  "id"              TEXT          NOT NULL,
  "shopId"          TEXT          NOT NULL,
  "customerId"      TEXT          NOT NULL,
  "deliveryType"    "OrderDelivery" NOT NULL,
  "paymentMethod"   "OrderPayment"  NOT NULL,
  "deliveryAddress" TEXT,
  "customerNote"    TEXT,
  "screenshotUrl"   TEXT,
  "status"          "OrderStatus"   NOT NULL DEFAULT 'PENDING',
  "totalAmount"     DECIMAL(65,30)  NOT NULL,
  "currency"        TEXT            NOT NULL DEFAULT 'PKR',
  "createdAt"       TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShopOrder"
  ADD CONSTRAINT "ShopOrder_shopId_fkey"     FOREIGN KEY ("shopId")     REFERENCES "Shop"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ShopOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX "ShopOrder_shopId_status_createdAt_idx" ON "ShopOrder" ("shopId", "status", "createdAt");
CREATE INDEX "ShopOrder_customerId_createdAt_idx"     ON "ShopOrder" ("customerId", "createdAt");

-- ── ShopOrderItem ────────────────────────────────────────────────────────────

CREATE TABLE "ShopOrderItem" (
  "id"            TEXT           NOT NULL,
  "orderId"       TEXT           NOT NULL,
  "productId"     TEXT           NOT NULL,
  "name"          TEXT           NOT NULL,
  "priceSnapshot" DECIMAL(65,30) NOT NULL,
  "quantity"      INTEGER        NOT NULL DEFAULT 1,
  CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShopOrderItem"
  ADD CONSTRAINT "ShopOrderItem_orderId_fkey"   FOREIGN KEY ("orderId")   REFERENCES "ShopOrder"("id")   ON DELETE CASCADE,
  ADD CONSTRAINT "ShopOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT;

-- ── ShopReport ───────────────────────────────────────────────────────────────

CREATE TABLE "ShopReport" (
  "id"         TEXT               NOT NULL,
  "shopId"     TEXT               NOT NULL,
  "reporterId" TEXT               NOT NULL,
  "reason"     "ShopReportReason" NOT NULL,
  "details"    TEXT,
  "status"     "ShopReportStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt"  TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopReport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShopReport"
  ADD CONSTRAINT "ShopReport_shopId_fkey"     FOREIGN KEY ("shopId")     REFERENCES "Shop"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ShopReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE INDEX "ShopReport_shopId_status_idx"   ON "ShopReport" ("shopId", "status");
CREATE INDEX "ShopReport_status_createdAt_idx" ON "ShopReport" ("status", "createdAt");

-- ── ShopReview ───────────────────────────────────────────────────────────────

CREATE TABLE "ShopReview" (
  "id"        TEXT         NOT NULL,
  "shopId"    TEXT         NOT NULL,
  "authorId"  TEXT         NOT NULL,
  "orderId"   TEXT,
  "rating"    INTEGER      NOT NULL,
  "body"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopReview_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShopReview"
  ADD CONSTRAINT "ShopReview_shopId_fkey"   FOREIGN KEY ("shopId")   REFERENCES "Shop"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ShopReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "ShopReview_shopId_authorId_key" ON "ShopReview" ("shopId", "authorId");
CREATE INDEX        "ShopReview_shopId_createdAt_idx" ON "ShopReview" ("shopId", "createdAt");

-- ── ShopFavourite ────────────────────────────────────────────────────────────

CREATE TABLE "ShopFavourite" (
  "id"        TEXT         NOT NULL,
  "shopId"    TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopFavourite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShopFavourite"
  ADD CONSTRAINT "ShopFavourite_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "ShopFavourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "ShopFavourite_shopId_userId_key" ON "ShopFavourite" ("shopId", "userId");
CREATE INDEX        "ShopFavourite_userId_createdAt_idx" ON "ShopFavourite" ("userId", "createdAt");
