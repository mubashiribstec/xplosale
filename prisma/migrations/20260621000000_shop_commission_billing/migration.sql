-- Shop billing mode (subscription vs commission), per-shop commission rate, and commission ledger

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ShopBillingMode" AS ENUM ('SUBSCRIPTION', 'COMMISSION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE "CommissionEntryType" AS ENUM ('ACCRUAL', 'SETTLEMENT', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- AlterTable
ALTER TABLE "Shop"
    ADD COLUMN IF NOT EXISTS "billingMode" "ShopBillingMode" NOT NULL DEFAULT 'SUBSCRIPTION',
    ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "CommissionEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(5,2),
    "orderTotal" DECIMAL(12,2),
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CommissionLedgerEntry_orderId_key" ON "CommissionLedgerEntry"("orderId");
CREATE INDEX IF NOT EXISTS "CommissionLedgerEntry_shopId_createdAt_idx" ON "CommissionLedgerEntry"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
