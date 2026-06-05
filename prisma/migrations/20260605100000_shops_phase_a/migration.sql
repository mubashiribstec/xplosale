-- Phase A: Shops section — schema additions
-- Additive only; no existing tables altered.

-- Enums
CREATE TYPE "ShopStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED');
CREATE TYPE "ShopImageKind" AS ENUM ('STOREFRONT_BOARD', 'GENERAL');
CREATE TYPE "PlanKey" AS ENUM ('FREE', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "AnalyticsEventKind" AS ENUM ('VIEW', 'PRODUCT_CLICK', 'CONTACT_CLICK', 'WEBSITE_CLICK');

-- Plan (seeded by application; not user-created)
CREATE TABLE "Plan" (
  "id"                  TEXT     NOT NULL,
  "key"                 "PlanKey" NOT NULL,
  "name"                TEXT     NOT NULL,
  "priceMonthly"        DECIMAL(65,30) NOT NULL,
  "currency"            TEXT     NOT NULL DEFAULT 'PKR',
  "maxShops"            INTEGER  NOT NULL,
  "maxProducts"         INTEGER  NOT NULL,
  "maxImagesPerProduct" INTEGER  NOT NULL,
  "featuredPlacement"   BOOLEAN  NOT NULL DEFAULT false,
  "analytics"           BOOLEAN  NOT NULL DEFAULT false,
  "customBanner"        BOOLEAN  NOT NULL DEFAULT false,
  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- Shop
CREATE TABLE "Shop" (
  "id"           TEXT         NOT NULL,
  "ownerUserId"  TEXT         NOT NULL,
  "name"         TEXT         NOT NULL,
  "slug"         TEXT         NOT NULL,
  "category"     TEXT         NOT NULL,
  "type"         TEXT         NOT NULL,
  "description"  TEXT         NOT NULL,
  "addressLine"  TEXT         NOT NULL,
  "regionId"     TEXT         NOT NULL,
  "countryCode"  TEXT         NOT NULL DEFAULT 'PK',
  "website"      TEXT,
  "contactPhone" TEXT,
  "lat"          DOUBLE PRECISION,
  "lng"          DOUBLE PRECISION,
  "status"       "ShopStatus" NOT NULL DEFAULT 'DRAFT',
  "verifiedShop" BOOLEAN      NOT NULL DEFAULT false,
  "featured"     BOOLEAN      NOT NULL DEFAULT false,
  "bannerUrl"    TEXT,
  "searchVector" tsvector,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");
CREATE INDEX "Shop_status_regionId_featured_createdAt_idx" ON "Shop"("status", "regionId", "featured", "createdAt");
CREATE INDEX "Shop_ownerUserId_status_idx" ON "Shop"("ownerUserId", "status");
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_regionId_fkey"
  FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ShopImage
CREATE TABLE "ShopImage" (
  "id"     TEXT           NOT NULL,
  "shopId" TEXT           NOT NULL,
  "url"    TEXT           NOT NULL,
  "kind"   "ShopImageKind" NOT NULL,
  "order"  INTEGER        NOT NULL,
  "width"  INTEGER        NOT NULL,
  "height" INTEGER        NOT NULL,
  CONSTRAINT "ShopImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShopImage_shopId_kind_idx" ON "ShopImage"("shopId", "kind");
ALTER TABLE "ShopImage" ADD CONSTRAINT "ShopImage_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ShopProduct
CREATE TABLE "ShopProduct" (
  "id"           TEXT     NOT NULL,
  "shopId"       TEXT     NOT NULL,
  "name"         TEXT     NOT NULL,
  "description"  TEXT,
  "priceMin"     DECIMAL(65,30),
  "priceMax"     DECIMAL(65,30),
  "currency"     TEXT     NOT NULL DEFAULT 'PKR',
  "order"        INTEGER  NOT NULL DEFAULT 0,
  "isHidden"     BOOLEAN  NOT NULL DEFAULT false,
  "searchVector" tsvector,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShopProduct_shopId_isHidden_order_idx" ON "ShopProduct"("shopId", "isHidden", "order");
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ShopProductImage
CREATE TABLE "ShopProductImage" (
  "id"        TEXT    NOT NULL,
  "productId" TEXT    NOT NULL,
  "url"       TEXT    NOT NULL,
  "order"     INTEGER NOT NULL,
  "width"     INTEGER NOT NULL,
  "height"    INTEGER NOT NULL,
  CONSTRAINT "ShopProductImage_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ShopProductImage" ADD CONSTRAINT "ShopProductImage_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscription
CREATE TABLE "Subscription" (
  "id"                TEXT                 NOT NULL,
  "shopId"            TEXT                 NOT NULL,
  "planKey"           "PlanKey"            NOT NULL,
  "status"            "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
  "provider"          TEXT                 NOT NULL,
  "externalRef"       TEXT,
  "startedAt"         TIMESTAMPTZ,
  "currentPeriodEnd"  TIMESTAMPTZ,
  "cancelAtPeriodEnd" BOOLEAN              NOT NULL DEFAULT false,
  "createdAt"         TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMPTZ          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_shopId_key" ON "Subscription"("shopId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ShopAnalyticsEvent
CREATE TABLE "ShopAnalyticsEvent" (
  "id"        TEXT                NOT NULL,
  "shopId"    TEXT                NOT NULL,
  "kind"      "AnalyticsEventKind" NOT NULL,
  "productId" TEXT,
  "day"       DATE                NOT NULL,
  "count"     INTEGER             NOT NULL DEFAULT 1,
  CONSTRAINT "ShopAnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShopAnalyticsEvent_shopId_day_idx" ON "ShopAnalyticsEvent"("shopId", "day");
ALTER TABLE "ShopAnalyticsEvent" ADD CONSTRAINT "ShopAnalyticsEvent_shopId_fkey"
  FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
