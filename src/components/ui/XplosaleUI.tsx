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

/* ─── VerificationSeal ───────────────────────────────────────────────────── */
export function VerificationSeal({ size = 132 }: { size?: number }) {
  const ticks = Array.from({ length: 48 });
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-label="Verified seal">
      <defs>
        <linearGradient id="sealG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--green-bright)" />
          <stop offset="1" stopColor="var(--green-deep)" />
        </linearGradient>
      </defs>
      <g>
        {ticks.map((_, i) => {
          const a = (i / 48) * Math.PI * 2;
          const long = i % 4 === 0;
          const r1 = long ? 50 : 53;
          return (
            <line
              key={i}
              x1={60 + Math.cos(a) * r1}
              y1={60 + Math.sin(a) * r1}
              x2={60 + Math.cos(a) * 57}
              y2={60 + Math.sin(a) * 57}
              stroke="var(--ink)"
              strokeWidth={long ? 1.4 : 0.8}
              opacity={long ? 0.85 : 0.35}
            />
          );
        })}
      </g>
      <circle cx="60" cy="60" r="46" fill="none" stroke="var(--ink)" strokeWidth="1" opacity="0.25" />
      <path
        d="M60 22l26 10v17c0 16-11 27-26 33-15-6-26-17-26-33V32l26-10Z"
        fill="url(#sealG)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      <path
        d="M60 30l19 7.4v13.6c0 12-8 20.4-19 25-11-4.6-19-13-19-25V37.4L60 30Z"
        fill="none"
        stroke="rgba(28,24,21,.28)"
        strokeWidth="1"
      />
      <path
        d="M50 60.5l7 7 14-15"
        fill="none"
        stroke="var(--white)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
