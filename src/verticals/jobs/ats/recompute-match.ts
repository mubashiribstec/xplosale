/**
 * Recompute (upsert) CandidateMatch for one or all applications on a job.
 * Called after: resume re-upload, job skills/keywords edit.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { computeMatchScore } from "./match-score";
import { getObject } from "@/core/adapters/storage";
import { parseResumePdf } from "./resume-parser";

async function ensureResumeParsed(jobSeekerId: string): Promise<string | null> {
  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { id: jobSeekerId },
    select: { id: true, resumeUrl: true, resumeParsed: { select: { rawText: true } } },
  });
  if (!profile?.resumeUrl) return null;
  if (profile.resumeParsed) return profile.resumeParsed.rawText;
  // Not yet parsed — fetch and parse now
  try {
    const buf = await getObject("private", profile.resumeUrl);
    const { rawText, extracted } = await parseResumePdf(buf);
    const extractedJson = extracted as unknown as Prisma.InputJsonValue;
    await prisma.resumeParsed.upsert({
      where: { jobSeekerProfileId: profile.id },
      update: { rawText, extracted: extractedJson, parsedAt: new Date(), source: "UPLOAD" },
      create: { jobSeekerProfileId: profile.id, rawText, extracted: extractedJson, source: "UPLOAD" },
    });
    return rawText;
  } catch {
    return null;
  }
}

export async function recomputeMatchForApplication(applicationId: string): Promise<void> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      jobPostingId: true,
      jobSeekerId: true,
      jobPosting: {
        select: { requiredSkills: true, niceToHaveSkills: true, requiredKeywords: true },
      },
    },
  });
  if (!app) return;

  const rawText = await ensureResumeParsed(app.jobSeekerId);
  if (!rawText) return;

  const job = app.jobPosting;
  const result = computeMatchScore({
    rawText,
    requiredSkills: (job.requiredSkills as string[]) ?? [],
    niceToHaveSkills: (job.niceToHaveSkills as string[]) ?? [],
    requiredKeywords: (job.requiredKeywords as string[]) ?? [],
  });

  await prisma.candidateMatch.upsert({
    where: { applicationId },
    update: { ...result, computedAt: new Date() },
    create: { applicationId, jobPostingId: app.jobPostingId, ...result },
  });
}

export async function recomputeMatchesForJob(jobPostingId: string): Promise<void> {
  const applications = await prisma.application.findMany({
    where: { jobPostingId },
    select: { id: true },
  });
  await Promise.all(applications.map((a) => recomputeMatchForApplication(a.id)));
}
