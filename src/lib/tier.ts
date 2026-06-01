export type UserTier = "BASIC" | "VERIFIED" | "PARTNER";

export function getUserTier(user: {
  isPartner: boolean;
  verificationStatus: string;
}): UserTier {
  if (user.isPartner) return "PARTNER";
  if (user.verificationStatus === "VERIFIED") return "VERIFIED";
  return "BASIC";
}
