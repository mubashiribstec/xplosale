"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{
        padding: "11px 26px",
        background: "var(--clay)",
        color: "var(--white)",
        border: "none",
        borderRadius: 11,
        fontSize: 14,
        fontWeight: 700,
        fontFamily: "var(--body)",
        cursor: "pointer",
      }}
    >
      🖨 Print poster
    </button>
  );
}
