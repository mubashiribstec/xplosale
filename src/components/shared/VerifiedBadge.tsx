interface VerifiedBadgeProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "verified" | "partner";
  tier?: "VERIFIED" | "PARTNER" | "BASIC";
}

/**
 * Trust badge. variant/tier="partner" → gold star. Default → green shield.
 * Only render when the badge is actually allocated (don't conditionally hide
 * here — callers are responsible for the show/hide guard).
 */
export function VerifiedBadge({
  label,
  size = "sm",
  variant,
  tier,
}: VerifiedBadgeProps) {
  const isPartner = variant === "partner" || tier === "PARTNER";
  const defaultLabel = isPartner ? "Partner" : "Verified";
  const displayLabel = label ?? defaultLabel;

  const fs = size === "lg" ? "13.5px" : size === "md" ? "12.5px" : "11.5px";
  const pad =
    size === "lg"
      ? "7px 13px 7px 9px"
      : size === "md"
      ? "5px 10px 5px 7px"
      : "4px 9px 4px 6px";
  const iconSize = size === "lg" ? 15 : size === "md" ? 13 : 12;

  if (isPartner) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: size === "sm" ? 4 : 5,
          background: "rgba(217,119,6,.11)",
          border: "1px solid rgba(217,119,6,.30)",
          color: "#92400e",
          borderRadius: 999,
          fontSize: fs,
          fontWeight: 600,
          padding: pad,
          fontFamily: "var(--body)",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {/* Star icon */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M8 1.5l1.545 3.13 3.455.5-2.5 2.435.59 3.435L8 9.25l-3.09 1.75.59-3.435L3 5.13l3.455-.5L8 1.5z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
            fill="rgba(217,119,6,.20)"
          />
        </svg>
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size === "sm" ? 4 : 5,
        background: "rgba(15,184,126,.12)",
        border: "1px solid rgba(15,184,126,.32)",
        color: "var(--green-deep)",
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 600,
        padding: pad,
        fontFamily: "var(--body)",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {/* Shield with checkmark */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 1L14 3.5V9C14 12.3 11.4 15.3 8 17C4.6 15.3 2 12.3 2 9V3.5L8 1Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="rgba(15,184,126,.15)"
        />
        <path
          d="M5.5 9L7 10.5L10.5 7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {displayLabel}
    </span>
  );
}

export default VerifiedBadge;
