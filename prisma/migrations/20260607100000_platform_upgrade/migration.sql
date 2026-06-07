-- Platform upgrade: user section/category bans + company job plan

ALTER TABLE "User" ADD COLUMN "bannedSections" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "bannedMarketplaceCategories" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN "bannedJobCategories" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Company" ADD COLUMN "jobPlanKey" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Company" ADD COLUMN "jobPostLimit" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "Company" ADD COLUMN "jobPlanExpiresAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "jobPostCredits" INTEGER NOT NULL DEFAULT 0;
