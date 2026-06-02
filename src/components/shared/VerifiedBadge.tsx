interface VerifiedBadgeProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  tier?: "VERIFIED" | "PARTNER" | "BASIC";
}

/**
 * Inline green-shield "Verified" badge.
 * sm: 11.5px / md: 12.5px / lg: 13.5px
 */
export function VerifiedBadge({ label = "Verified", size = "sm" }: VerifiedBadgeProps) {
  const fs = size === "lg" ? "13.5px" : size === "md" ? "12.5px" : "11.5px";
  const pad = size === "lg" ? "7px 13px 7px 9px" : size === "md" ? "5px 10px 5px 7px" : "4px 9px 4px 6px";
  const iconSize = size === "lg" ? 15 : size === "md" ? 13 : 12;

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
        xmlns="http://www.w3.org/2000/svg"
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
      {label}
    </span>
  );
}

export default VerifiedBadge;
