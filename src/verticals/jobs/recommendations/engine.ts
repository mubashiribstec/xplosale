import type { JobPosting, JobSeekerProfile, User } from "@prisma/client";

export interface ScoredJob {
  jobPostingId: string;
  score: number;
  reasons: string[];
}

export async function computeRecommendations(
  profile: JobSeekerProfile & { user: User },
  jobs: JobPosting[],
  appliedJobIds: Set<string>
): Promise<ScoredJob[]> {
  const preferredRegionIds = Array.isArray(profile.preferredRegionIds)
    ? (profile.preferredRegionIds as string[])
    : [];
  const doNotRecommendCompanyIds = Array.isArray(profile.doNotRecommendCompanyIds)
    ? (profile.doNotRecommendCompanyIds as string[])
    : [];

  // Collect user skills from name field as a fallback; real skills come via Network profile
  // The spec says: profile.user.skills — we check NetworkProfile skills via a workaround using
  // the resume or title. Per the spec, use simple toLower().includes() on title/description
  // against skills stored on the user. Since User has no direct skills field, we derive
  // skill-like tokens from the job seeker headline/currentRoleTitle as proxy.
  const userSkillTokens: string[] = [];
  if (profile.headline) {
    userSkillTokens.push(...profile.headline.toLowerCase().split(/[\s,|/]+/).filter((s) => s.length > 2));
  }
  if (profile.currentRoleTitle) {
    userSkillTokens.push(...profile.currentRoleTitle.toLowerCase().split(/[\s,|/]+/).filter((s) => s.length > 2));
  }

  const results: ScoredJob[] = [];

  for (const job of jobs) {
    // Hard exclusions
    if (job.status !== "ACTIVE") continue;
    if (appliedJobIds.has(job.id)) continue;
    if (doNotRecommendCompanyIds.includes(job.companyId)) continue;

    let score = 0;
    const reasons: string[] = [];

    // +0.4 if job.regionId in preferredRegionIds OR remoteType is REMOTE
    if (job.remoteType === "REMOTE" || preferredRegionIds.includes(job.regionId)) {
      score += 0.4;
      reasons.push("Matches your region");
    }

    // +0.3 if job.remoteType === profile.preferredRemoteType
    if (profile.preferredRemoteType && job.remoteType === profile.preferredRemoteType) {
      score += 0.3;
      reasons.push("Matches remote preference");
    }

    // +0.2 if job title or description contains any of profile skills
    if (userSkillTokens.length > 0) {
      const titleLower = job.title.toLowerCase();
      const descLower = job.description.toLowerCase();
      const skillMatch = userSkillTokens.some(
        (token) => titleLower.includes(token) || descLower.includes(token)
      );
      if (skillMatch) {
        score += 0.2;
        reasons.push("Matches your skills");
      }
    }

    // +0.1 if salary range overlaps profile.expectedSalaryMin/Max
    if (
      profile.expectedSalaryMin != null &&
      profile.expectedSalaryMax != null &&
      job.salaryMin != null &&
      job.salaryMax != null
    ) {
      const overlaps =
        job.salaryMin <= profile.expectedSalaryMax &&
        job.salaryMax >= profile.expectedSalaryMin;
      if (overlaps) {
        score += 0.1;
        reasons.push("Within your salary range");
      }
    } else if (
      (profile.expectedSalaryMin != null || profile.expectedSalaryMax != null) &&
      (job.salaryMin != null || job.salaryMax != null)
    ) {
      // Partial overlap check when one side is unbounded
      const profileMin = profile.expectedSalaryMin ?? 0;
      const profileMax = profile.expectedSalaryMax ?? Number.MAX_SAFE_INTEGER;
      const jobMin = job.salaryMin ?? 0;
      const jobMax = job.salaryMax ?? Number.MAX_SAFE_INTEGER;
      if (jobMin <= profileMax && jobMax >= profileMin) {
        score += 0.1;
        reasons.push("Within your salary range");
      }
    }

    // Cap at 1.0
    score = Math.min(1.0, score);

    // Only include jobs scoring above threshold
    if (score > 0.2) {
      results.push({ jobPostingId: job.id, score, reasons });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results;
}
