-- Phase 25: Search Infrastructure
-- Apply with: pnpm tsx scripts/apply-search-migration.ts
-- Or directly: psql $DATABASE_URL -f prisma/migrations/search_infra.sql

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── searchVector columns (idempotent) ────────────────────────────────────────

ALTER TABLE "Listing"        ADD COLUMN IF NOT EXISTS "searchVector" tsvector;
ALTER TABLE "JobPosting"     ADD COLUMN IF NOT EXISTS "searchVector" tsvector;
ALTER TABLE "Company"        ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- ─── GIN indexes on searchVector ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_listing_search
  ON "Listing" USING GIN("searchVector");

CREATE INDEX IF NOT EXISTS idx_jobposting_search
  ON "JobPosting" USING GIN("searchVector");

CREATE INDEX IF NOT EXISTS idx_company_search
  ON "Company" USING GIN("searchVector");

-- ─── pg_trgm GIN indexes on short text ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_listing_title_trgm
  ON "Listing" USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_jobposting_title_trgm
  ON "JobPosting" USING GIN(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_company_name_trgm
  ON "Company" USING GIN(name gin_trgm_ops);

-- ─── Trigger functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_listing_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_jobposting_search_vector() RETURNS trigger AS $$
DECLARE
  company_name TEXT;
  skills_text  TEXT;
BEGIN
  SELECT name INTO company_name FROM "Company" WHERE id = NEW."companyId";
  SELECT coalesce(string_agg(val, ' '), '')
    INTO skills_text
    FROM jsonb_array_elements_text(
      coalesce(NEW."requiredSkills", '[]'::jsonb) ||
      coalesce(NEW."niceToHaveSkills", '[]'::jsonb) ||
      coalesce(NEW."requiredKeywords", '[]'::jsonb)
    ) AS val;

  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(company_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(skills_text, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_company_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.industry, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── Triggers (drop first to allow re-application) ───────────────────────────

DROP TRIGGER IF EXISTS listing_search_vector_trigger    ON "Listing";
DROP TRIGGER IF EXISTS jobposting_search_vector_trigger ON "JobPosting";
DROP TRIGGER IF EXISTS company_search_vector_trigger    ON "Company";

CREATE TRIGGER listing_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Listing"
  FOR EACH ROW EXECUTE FUNCTION update_listing_search_vector();

CREATE TRIGGER jobposting_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "JobPosting"
  FOR EACH ROW EXECUTE FUNCTION update_jobposting_search_vector();

CREATE TRIGGER company_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Company"
  FOR EACH ROW EXECUTE FUNCTION update_company_search_vector();
