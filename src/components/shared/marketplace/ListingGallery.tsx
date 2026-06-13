"use client";

import { useState } from "react";
import Image from "next/image";

interface ListingGalleryProps {
  images: { url: string; id: string }[];
  alt: string;
  sold?: boolean;
}

export default function ListingGallery({ images, alt, sold }: ListingGalleryProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 18, background: "var(--paper-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 14 }}>
        No image
      </div>
    );
  }

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", borderRadius: 18, overflow: "hidden", background: "var(--paper-2)", border: "1px solid var(--line)" }}>
        <Image src={current.url} alt={alt} fill priority style={{ objectFit: "cover" }} sizes="(max-width: 880px) 100vw, 660px" />
        {sold && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(26,22,19,.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: ".08em", color: "#fff", background: "var(--clay)", padding: "8px 22px", borderRadius: 99, transform: "rotate(-6deg)" }}>
              SOLD
            </span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              style={{
                position: "relative", width: 72, height: 58, borderRadius: 10, overflow: "hidden", padding: 0,
                border: i === index ? "2px solid var(--clay)" : "1px solid var(--line)",
                cursor: "pointer", flexShrink: 0, background: "var(--paper-2)",
                opacity: i === index ? 1 : 0.7, transition: "opacity .15s, border-color .15s",
              }}
            >
              <Image src={img.url} alt="" fill style={{ objectFit: "cover" }} sizes="72px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
