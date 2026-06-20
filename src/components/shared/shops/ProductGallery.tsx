"use client";

import { useState } from "react";

interface ProductGalleryProps {
  images: { url: string }[];
  alt: string;
}

export default function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div style={{
        width: "100%", aspectRatio: "4 / 3", borderRadius: 16, background: "var(--paper-2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56,
      }}>
        🛍️
      </div>
    );
  }

  const current = images[Math.min(index, images.length - 1)];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ width: "100%", aspectRatio: "4 / 3", borderRadius: 16, overflow: "hidden", background: "var(--paper-2)", border: "1px solid var(--line)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={alt}
          width={800}
          height={600}
          style={{ width: "100%", height: "100%", objectFit: "cover", animation: "fade .25s ease" }}
        />
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              style={{
                width: 64, height: 52, borderRadius: 9, overflow: "hidden", padding: 0,
                border: i === index ? "2px solid var(--clay)" : "1px solid var(--line)",
                cursor: "pointer", flexShrink: 0, background: "var(--paper-2)",
                opacity: i === index ? 1 : 0.7, transition: "opacity .15s, border-color .15s",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`${alt} — thumbnail ${i + 1}`} width={64} height={52} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
