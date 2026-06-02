"use client";

import React from "react";

/* ─── KhatamPattern ──────────────────────────────────────────────────────── */
export function KhatamPattern({
  color = "var(--ink)",
  opacity = 0.05,
  scale = 64,
  className,
}: {
  color?: string;
  opacity?: number;
  scale?: number;
  className?: string;
}) {
  const id = "kh" + Math.round(scale);
  const c = scale / 2;
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? c * 0.92 : c * 0.42;
    pts.push(`${c + Math.cos(a) * r},${c + Math.sin(a) * r}`);
  }
  return (
    <svg
      width="100%"
      height="100%"
      className={className}
      style={{ position: "absolute", inset: 0, opacity, pointerEvents: "none" }}
      aria-hidden
    >
      <defs>
        <pattern id={id} width={scale} height={scale} patternUnits="userSpaceOnUse">
          <polygon points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1" />
          <circle cx={c} cy={c} r={c * 0.16} fill="none" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/* ─── TrustGauge ─────────────────────────────────────────────────────────── */
export function TrustGauge({
  value = 88,
  size = 120,
  stroke = 9,
}: {
  value?: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - value / 100);
  const color =
    value >= 80 ? "var(--green)" : value >= 60 ? "#C99A2E" : "var(--clay)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--paper-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: size * 0.3,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontSize: size * 0.085,
              color: "var(--ink-faint)",
              fontWeight: 600,
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            / 100
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── XBtn ───────────────────────────────────────────────────────────────── */
interface XBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "clay" | "green" | "ghost" | "line";
  size?: "sm" | "md" | "lg";
}

export function XBtn({ variant = "clay", size = "md", children, style, ...rest }: XBtnProps) {
  const bg: Record<string, string> = {
    clay: "var(--clay)",
    green: "var(--green)",
    ghost: "transparent",
    line: "transparent",
  };
  const fg: Record<string, string> = {
    clay: "var(--white)",
    green: "var(--white)",
    ghost: "var(--ink-soft)",
    line: "var(--ink-soft)",
  };
  const border: Record<string, string> = {
    clay: "1px solid transparent",
    green: "1px solid transparent",
    ghost: "none",
    line: "1px solid var(--line)",
  };
  const fs: Record<string, string> = { sm: "12px", md: "14px", lg: "15px" };
  const px: Record<string, string> = { sm: "12px 10px", md: "10px 18px", lg: "13px 24px" };

  return (
    <button
      style={{
        background: bg[variant],
        color: fg[variant],
        border: border[variant],
        borderRadius: 10,
        fontSize: fs[size],
        fontFamily: "var(--body)",
        fontWeight: 600,
        padding: px[size],
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.5 : 1,
        transition: "opacity .15s, filter .15s",
        lineHeight: 1.4,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ─── VerificationSeal ──────────────────────────────────────────────────── */
interface VerificationSealProps {
  label?: string;
  size?: "sm" | "lg";
}

export function VerificationSeal({ label = "Verified", size = "sm" }: VerificationSealProps) {
  const fs = size === "sm" ? 11.5 : 13.5;
  const pad = size === "sm" ? "4px 9px 4px 6px" : "7px 13px 7px 9px";
  const iconSize = size === "sm" ? 12 : 15;

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
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M8 1L10.1 5.3L15 5.9L11.5 9.3L12.4 14.2L8 11.9L3.6 14.2L4.5 9.3L1 5.9L5.9 5.3L8 1Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M5.5 8L7 9.5L10.5 6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </span>
  );
}
