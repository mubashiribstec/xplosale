import Link from "next/link";
import type { UserTier } from "@/lib/tier";
import { VerifiedBadge } from "./VerifiedBadge";

interface TierCardProps {
  tier: UserTier;
  verificationStatus: string;
}

export function TierCard({ tier, verificationStatus }: TierCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Account Tier</p>
          {tier === "PARTNER" && (
            <div className="flex items-center gap-2">
              <VerifiedBadge tier="PARTNER" size="md" />
              <span className="text-sm text-gray-500">Verified Partner</span>
            </div>
          )}
          {tier === "VERIFIED" && (
            <div className="flex items-center gap-2">
              <VerifiedBadge tier="VERIFIED" size="md" />
              <span className="text-sm text-gray-500">Identity Verified</span>
            </div>
          )}
          {tier === "BASIC" && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                Basic
              </span>
            </div>
          )}
        </div>
        <div className="text-right text-sm">
          {tier === "BASIC" && verificationStatus !== "PENDING" && (
            <Link href="/me/verify-identity" className="text-blue-600 font-medium hover:underline">
              Get Verified →
            </Link>
          )}
          {tier === "BASIC" && verificationStatus === "PENDING" && (
            <span className="text-amber-600 font-medium">Verification pending…</span>
          )}
          {tier === "VERIFIED" && (
            <Link href="/me/partner-application" className="text-amber-600 font-medium hover:underline">
              Apply for Partner Status →
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {["BASIC", "VERIFIED", "PARTNER"].map((t, i) => (
          <div
            key={t}
            className={`h-1.5 flex-1 rounded-full ${
              i <= ["BASIC", "VERIFIED", "PARTNER"].indexOf(tier)
                ? tier === "PARTNER" ? "bg-amber-400" : "bg-green-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>Basic</span><span>Verified</span><span>Partner</span>
      </div>
    </div>
  );
}
