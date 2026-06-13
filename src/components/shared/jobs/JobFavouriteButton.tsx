"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";

interface JobFavouriteButtonProps {
  jobId: string;
  initialFavourited: boolean;
  isAuthenticated: boolean;
  size?: "sm" | "md";
}

export default function JobFavouriteButton({ jobId, initialFavourited, isAuthenticated, size = "md" }: JobFavouriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [favourited, setFavourited] = useState(initialFavourited);
  const [busy, setBusy] = useState(false);

  const dim = size === "sm" ? 32 : 40;
  const icon = size === "sm" ? 16 : 19;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy) return;

    const next = !favourited;
    setFavourited(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/favourite`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) setFavourited(!next);
    } catch {
      setFavourited(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void toggle(e)}
      aria-label={favourited ? "Remove from saved jobs" : "Save job"}
      title={favourited ? "Remove from saved jobs" : "Save job"}
      style={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        border: "1px solid var(--line)",
        background: "var(--white)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "var(--shadow)",
        transition: "transform .15s ease",
        flexShrink: 0,
        padding: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <Heart
        size={icon}
        color={favourited ? "var(--clay)" : "var(--ink-faint)"}
        fill={favourited ? "var(--clay)" : "none"}
        strokeWidth={2}
      />
    </button>
  );
}
