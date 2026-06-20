-- Shopkeeper application flow + built-in Super Admin flag

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "hasShopkeeperBadge" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT,
    "description" TEXT NOT NULL,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ShopApplication_userId_key" ON "ShopApplication"("userId");

-- AddForeignKey
ALTER TABLE "ShopApplication" ADD CONSTRAINT "ShopApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
