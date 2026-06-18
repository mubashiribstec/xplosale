export type UserTier = "BASIC" | "VERIFIED" | "PARTNER";

export function getUserTier(user: {
  role?: string;
  isPartner: boolean;
  verificationStatus: string;
  hasVerifiedBadge?: boolean;
}): UserTier {
  if (user.role === "ADMIN" || user.role === "PARTNER" || user.isPartner) return "PARTNER";
  if (user.hasVerifiedBadge || user.verificationStatus === "VERIFIED") return "VERIFIED";
  return "BASIC";
}

/** Free (BASIC) listings expire after 7 days; paid tiers (VERIFIED/PARTNER) get 30 days. */
export function getListingExpiryDays(tier: UserTier): number {
  return tier === "BASIC" ? 7 : 30;
}

export function computeTrustScore(input: {
  emailVerified: boolean;
  verificationStatus: string;
  listingCount: number;
  endorsementCount: number;
}): number {
  let score = 0;
  if (input.emailVerified) score += 25;
  if (input.verificationStatus === "VERIFIED") score += 40;
  else if (input.verificationStatus === "PENDING") score += 10;
  score += Math.min(20, input.listingCount * 2);
  score += Math.min(15, input.endorsementCount * 3);
  return Math.min(100, score);
}
