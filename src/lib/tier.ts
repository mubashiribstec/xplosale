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
