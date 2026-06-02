-- Migration: phases_16_28
-- Adds all schema additions not present in the init migration.
-- ADDITIVE ONLY: no DROP TABLE, no DROP COLUMN.

-- =============================================================================
-- 1. ALTER EXISTING ENUMs (add new values)
-- =============================================================================

-- Role: add EMPLOYER_RECRUITER, EMPLOYER_HIRING_MANAGER, EMPLOYER_INTERVIEWER
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EMPLOYER_RECRUITER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EMPLOYER_HIRING_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EMPLOYER_INTERVIEWER';

-- ChatContext: add ADMIN_DM
ALTER TYPE "ChatContext" ADD VALUE IF NOT EXISTS 'ADMIN_DM';

-- NotificationKind: add new values
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'MENTION';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'TEST_ASSIGNED';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'INTERVIEW_SCHEDULED';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'INTERVIEW_REMINDER';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SCORECARD_REQUESTED';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'ADMIN_BROADCAST';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'ADMIN_DM';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'BAN_NOTICE';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'DATA_EXPORT_READY';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'JOB_RECOMMENDED';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'INVITE_TO_APPLY';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SAVED_SEARCH_DIGEST';

-- =============================================================================
-- 2. CREATE NEW ENUMs
-- =============================================================================

-- CreateEnum
CREATE TYPE "IdentityDocType" AS ENUM ('CNIC', 'PASSPORT');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'AGENCY');

-- CreateEnum
CREATE TYPE "PartnerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TestKind" AS ENUM ('MCQ', 'CODING', 'FREE_TEXT', 'VIDEO', 'FILE_UPLOAD', 'MIXED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'PENDING_GRADE', 'EXPIRED', 'GRADED');

-- CreateEnum
CREATE TYPE "SavedSearchFrequency" AS ENUM ('DAILY', 'WEEKLY', 'OFF');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HiringTeamRole" AS ENUM ('RECRUITER', 'HIRING_MANAGER', 'INTERVIEWER', 'OBSERVER');

-- CreateEnum
CREATE TYPE "EmailTemplateKind" AS ENUM ('INTERVIEW_INVITE', 'REJECT', 'OFFER', 'ASSESSMENT_INVITE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('SENT', 'FAILED', 'MOCKED');

-- CreateEnum
CREATE TYPE "EmailSendProvider" AS ENUM ('RESEND', 'CONSOLE');

-- =============================================================================
-- 3. ALTER EXISTING TABLES: ADD NEW COLUMNS
-- =============================================================================

-- User: add email, emailVerified, docType, isPartner, partnerType
-- phone and name become nullable in the new schema but we don't DROP NOT NULL
-- constraints via destructive ops; instead we ADD the new columns only.
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "email" TEXT,
    ADD COLUMN IF NOT EXISTS "emailVerified" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "docType" "IdentityDocType",
    ADD COLUMN IF NOT EXISTS "isPartner" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "partnerType" "PartnerType";

-- User: phone and name are now nullable in full schema
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "name" DROP NOT NULL;

-- Company: add searchVector
ALTER TABLE "Company"
    ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Listing: add searchVector
ALTER TABLE "Listing"
    ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- NetworkProfile: add searchVector
ALTER TABLE "NetworkProfile"
    ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- JobSeekerProfile: add recruiterDiscoverable, preferredRemoteType,
--                   preferredRegionIds, doNotRecommendCompanyIds
ALTER TABLE "JobSeekerProfile"
    ADD COLUMN IF NOT EXISTS "recruiterDiscoverable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "preferredRemoteType" "RemoteType",
    ADD COLUMN IF NOT EXISTS "preferredRegionIds" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "doNotRecommendCompanyIds" JSONB NOT NULL DEFAULT '[]';

-- JobPosting: add requiredSkills, niceToHaveSkills, requiredKeywords, searchVector
ALTER TABLE "JobPosting"
    ADD COLUMN IF NOT EXISTS "requiredSkills" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "niceToHaveSkills" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "requiredKeywords" JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Application: add applicantUserId, currentStageId
ALTER TABLE "Application"
    ADD COLUMN IF NOT EXISTS "applicantUserId" TEXT,
    ADD COLUMN IF NOT EXISTS "currentStageId" TEXT;

-- =============================================================================
-- 4. CREATE NEW INDEXES on existing tables
-- =============================================================================

-- CreateIndex (new unique index for User.email)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- =============================================================================
-- 5. CREATE NEW TABLES
-- =============================================================================

-- CreateTable: ResumeParsed
CREATE TABLE "ResumeParsed" (
    "id" TEXT NOT NULL,
    "jobSeekerProfileId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "rawText" TEXT NOT NULL,
    "extracted" JSONB,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResumeParsed_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PipelineStage
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isHired" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CandidateMatch
CREATE TABLE "CandidateMatch" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "requiredMatched" INTEGER NOT NULL,
    "requiredTotal" INTEGER NOT NULL,
    "niceToHaveMatched" INTEGER NOT NULL,
    "niceToHaveTotal" INTEGER NOT NULL,
    "keywordMatched" INTEGER NOT NULL,
    "keywordTotal" INTEGER NOT NULL,
    "matchedTerms" JSONB NOT NULL,
    "missedTerms" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: HiringTeam
CREATE TABLE "HiringTeam" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HiringTeamRole" NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiringTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CandidateNote
CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CandidateTag
CREATE TABLE "CandidateTag" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6B7280',

    CONSTRAINT "CandidateTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApplicationTag
CREATE TABLE "ApplicationTag" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ApplicationTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailTemplate
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "EmailTemplateKind" NOT NULL DEFAULT 'CUSTOM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailSendLog
CREATE TABLE "EmailSendLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT,
    "templateId" TEXT,
    "sentByUserId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailSendStatus" NOT NULL,
    "provider" "EmailSendProvider" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Account (NextAuth)
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Session (NextAuth)
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VerificationToken (NextAuth)
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable: PartnerApplication
CREATE TABLE "PartnerApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerType" "PartnerType" NOT NULL,
    "businessName" TEXT,
    "website" TEXT,
    "description" TEXT NOT NULL,
    "status" "PartnerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TestTemplate
CREATE TABLE "TestTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "TestKind" NOT NULL DEFAULT 'MCQ',
    "durationMin" INTEGER NOT NULL,
    "passingScorePercent" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TestQuestion
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "TestKind" NOT NULL DEFAULT 'MCQ',
    "body" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TestAssignment
CREATE TABLE "TestAssignment" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "scorePercent" DOUBLE PRECISION,
    "autoGraded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TestSubmission
CREATE TABLE "TestSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "autoScore" DOUBLE PRECISION,
    "manualScore" DOUBLE PRECISION,
    "graderNotes" TEXT,
    "gradedByUserId" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "TestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TestSession
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "focusLossCount" INTEGER NOT NULL DEFAULT 0,
    "fullscreenExits" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SavedSearch
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queryJson" JSONB NOT NULL,
    "frequency" "SavedSearchFrequency" NOT NULL DEFAULT 'OFF',
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SearchClickLog
CREATE TABLE "SearchClickLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "vertical" TEXT NOT NULL,
    "clickedId" TEXT NOT NULL,
    "clickedType" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchClickLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: JobRecommendation
CREATE TABLE "JobRecommendation" (
    "id" TEXT NOT NULL,
    "jobSeekerId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InviteToApply
CREATE TABLE "InviteToApply" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "message" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteToApply_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CandidateDoNotContact
CREATE TABLE "CandidateDoNotContact" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateDoNotContact_pkey" PRIMARY KEY ("id")
);

-- =============================================================================
-- 6. CREATE INDEXES FOR NEW TABLES
-- =============================================================================

-- ResumeParsed
CREATE UNIQUE INDEX "ResumeParsed_jobSeekerProfileId_key" ON "ResumeParsed"("jobSeekerProfileId");

-- CandidateMatch
CREATE UNIQUE INDEX "CandidateMatch_applicationId_key" ON "CandidateMatch"("applicationId");
CREATE INDEX "CandidateMatch_jobPostingId_score_idx" ON "CandidateMatch"("jobPostingId", "score");
CREATE UNIQUE INDEX "CandidateMatch_jobPostingId_applicationId_key" ON "CandidateMatch"("jobPostingId", "applicationId");

-- PipelineStage
CREATE INDEX "PipelineStage_companyId_idx" ON "PipelineStage"("companyId");
CREATE UNIQUE INDEX "PipelineStage_companyId_order_key" ON "PipelineStage"("companyId", "order");

-- HiringTeam
CREATE INDEX "HiringTeam_jobPostingId_idx" ON "HiringTeam"("jobPostingId");
CREATE UNIQUE INDEX "HiringTeam_jobPostingId_userId_key" ON "HiringTeam"("jobPostingId", "userId");

-- CandidateNote
CREATE INDEX "CandidateNote_applicationId_createdAt_idx" ON "CandidateNote"("applicationId", "createdAt");

-- CandidateTag
CREATE UNIQUE INDEX "CandidateTag_companyId_name_key" ON "CandidateTag"("companyId", "name");

-- ApplicationTag
CREATE UNIQUE INDEX "ApplicationTag_applicationId_tagId_key" ON "ApplicationTag"("applicationId", "tagId");

-- EmailSendLog
CREATE INDEX "EmailSendLog_applicationId_idx" ON "EmailSendLog"("applicationId");
CREATE INDEX "EmailSendLog_sentAt_idx" ON "EmailSendLog"("sentAt");

-- Account
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- Session
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- VerificationToken
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- PartnerApplication
CREATE UNIQUE INDEX "PartnerApplication_userId_key" ON "PartnerApplication"("userId");

-- TestTemplate
CREATE INDEX "TestTemplate_companyId_isPublished_idx" ON "TestTemplate"("companyId", "isPublished");

-- TestQuestion
CREATE INDEX "TestQuestion_templateId_order_idx" ON "TestQuestion"("templateId", "order");

-- TestAssignment
CREATE INDEX "TestAssignment_applicationId_status_idx" ON "TestAssignment"("applicationId", "status");

-- TestSubmission
CREATE UNIQUE INDEX "TestSubmission_assignmentId_questionId_key" ON "TestSubmission"("assignmentId", "questionId");

-- TestSession
CREATE UNIQUE INDEX "TestSession_assignmentId_key" ON "TestSession"("assignmentId");

-- SavedSearch
CREATE INDEX "SavedSearch_frequency_lastSentAt_idx" ON "SavedSearch"("frequency", "lastSentAt");
CREATE UNIQUE INDEX "SavedSearch_userId_name_key" ON "SavedSearch"("userId", "name");

-- SearchClickLog
CREATE INDEX "SearchClickLog_clickedId_createdAt_idx" ON "SearchClickLog"("clickedId", "createdAt");
CREATE INDEX "SearchClickLog_userId_createdAt_idx" ON "SearchClickLog"("userId", "createdAt");

-- JobRecommendation
CREATE INDEX "JobRecommendation_jobSeekerId_idx" ON "JobRecommendation"("jobSeekerId");
CREATE UNIQUE INDEX "JobRecommendation_jobSeekerId_jobPostingId_key" ON "JobRecommendation"("jobSeekerId", "jobPostingId");

-- InviteToApply
CREATE INDEX "InviteToApply_candidateUserId_status_sentAt_idx" ON "InviteToApply"("candidateUserId", "status", "sentAt");
CREATE INDEX "InviteToApply_companyId_sentAt_idx" ON "InviteToApply"("companyId", "sentAt");
CREATE UNIQUE INDEX "InviteToApply_jobPostingId_candidateUserId_key" ON "InviteToApply"("jobPostingId", "candidateUserId");

-- CandidateDoNotContact
CREATE UNIQUE INDEX "CandidateDoNotContact_userId_key" ON "CandidateDoNotContact"("userId");

-- =============================================================================
-- 7. ADD FOREIGN KEY CONSTRAINTS FOR NEW TABLES (and new columns on existing)
-- =============================================================================

-- Application: new column currentStageId FK (PipelineStage must exist first)
ALTER TABLE "Application" ADD CONSTRAINT "Application_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Application: new column applicantUserId FK
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ResumeParsed
ALTER TABLE "ResumeParsed" ADD CONSTRAINT "ResumeParsed_jobSeekerProfileId_fkey" FOREIGN KEY ("jobSeekerProfileId") REFERENCES "JobSeekerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PipelineStage
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CandidateMatch
ALTER TABLE "CandidateMatch" ADD CONSTRAINT "CandidateMatch_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateMatch" ADD CONSTRAINT "CandidateMatch_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HiringTeam
ALTER TABLE "HiringTeam" ADD CONSTRAINT "HiringTeam_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HiringTeam" ADD CONSTRAINT "HiringTeam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CandidateNote
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CandidateTag
ALTER TABLE "CandidateTag" ADD CONSTRAINT "CandidateTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ApplicationTag
ALTER TABLE "ApplicationTag" ADD CONSTRAINT "ApplicationTag_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicationTag" ADD CONSTRAINT "ApplicationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CandidateTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EmailTemplate
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EmailSendLog
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Account
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Session
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PartnerApplication
ALTER TABLE "PartnerApplication" ADD CONSTRAINT "PartnerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TestTemplate
ALTER TABLE "TestTemplate" ADD CONSTRAINT "TestTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TestQuestion
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TestAssignment
ALTER TABLE "TestAssignment" ADD CONSTRAINT "TestAssignment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestAssignment" ADD CONSTRAINT "TestAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TestTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestAssignment" ADD CONSTRAINT "TestAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- TestSubmission
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TestAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TestSession
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TestAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SavedSearch
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SearchClickLog
ALTER TABLE "SearchClickLog" ADD CONSTRAINT "SearchClickLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- JobRecommendation
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_jobSeekerId_fkey" FOREIGN KEY ("jobSeekerId") REFERENCES "JobSeekerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- InviteToApply
ALTER TABLE "InviteToApply" ADD CONSTRAINT "InviteToApply_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteToApply" ADD CONSTRAINT "InviteToApply_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteToApply" ADD CONSTRAINT "InviteToApply_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InviteToApply" ADD CONSTRAINT "InviteToApply_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CandidateDoNotContact
ALTER TABLE "CandidateDoNotContact" ADD CONSTRAINT "CandidateDoNotContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
