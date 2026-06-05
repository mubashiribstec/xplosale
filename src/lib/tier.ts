export type UserTier = "BASIC" | "VERIFIED" | "PARTNER";

export function getUserTier(user: {
  role?: string;
  isPartner: boolean;
  verificationStatus: string;
  hasVerifiedBadge?: boolean;
}): UserTier {
  if (user.role === "PARTNER" || user.isPartner) return "PARTNER";
  if (user.hasVerifiedBadge || user.verificationStatus === "VERIFIED") return "VERIFIED";
  return "BASIC";
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
