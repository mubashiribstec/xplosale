-- Job posting: rich location fields
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "country"        TEXT;
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "city"           TEXT;
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "postCode"       TEXT;
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "companyAddress" TEXT;
