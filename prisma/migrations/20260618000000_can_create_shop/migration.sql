-- Shopkeeper permission: gates shop creation independently of role/partner status

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "canCreateShop" BOOLEAN NOT NULL DEFAULT false;
