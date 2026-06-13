-- Jobs vertical upgrade: employment/experience facets, saved jobs, posting analytics

-- New enums
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE');
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'MID', 'SENIOR', 'LEAD');
CREATE TYPE "JobAnalyticsEventKind" AS ENUM ('VIEW', 'APPLY_CLICK', 'CONTACT_CLICK', 'SHARE_CLICK');

-- JobPosting: new search facets
ALTER TABLE "JobPosting" ADD COLUMN "employmentType" "EmploymentType";
ALTER TABLE "JobPosting" ADD COLUMN "experienceLevel" "ExperienceLevel";

-- ── JobFavourite ─────────────────────────────────────────────────────────────

CREATE TABLE "JobFavourite" (
  "id"           TEXT         NOT NULL,
  "jobPostingId" TEXT         NOT NULL,
  "userId"       TEXT         NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JobFavourite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JobFavourite"
  ADD CONSTRAINT "JobFavourite_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "JobFavourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "JobFavourite_jobPostingId_userId_key" ON "JobFavourite" ("jobPostingId", "userId");
CREATE INDEX        "JobFavourite_userId_createdAt_idx" ON "JobFavourite" ("userId", "createdAt");

-- ── JobAnalyticsEvent ────────────────────────────────────────────────────────

CREATE TABLE "JobAnalyticsEvent" (
  "id"           TEXT                    NOT NULL,
  "jobPostingId" TEXT                    NOT NULL,
  "kind"         "JobAnalyticsEventKind" NOT NULL,
  "day"          DATE                    NOT NULL,
  "count"        INTEGER                 NOT NULL DEFAULT 1,
  CONSTRAINT "JobAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobAnalyticsEvent_jobPostingId_day_idx" ON "JobAnalyticsEvent"("jobPostingId", "day");
ALTER TABLE "JobAnalyticsEvent" ADD CONSTRAINT "JobAnalyticsEvent_jobPostingId_fkey"
  FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
