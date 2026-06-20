"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { fmt } from "@/lib/format";

interface CountUpProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function CountUp({ value, className, style }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const counter = { n: 0 };
        gsap.to(counter, {
          n: value,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = fmt(Math.round(counter.n));
          },
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className} style={style}>
      {fmt(value)}
    </span>
  );
}
