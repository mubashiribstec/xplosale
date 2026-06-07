"use client";

import { useState, useEffect, useCallback } from "react";

interface Review {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string;
  author: { name: string | null };
}

interface ShopReviewsProps {
  shopId: string;
  currentUserId: string | null;
}

function Stars({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onClick={() => interactive && onRate?.(s)}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          style={{
            fontSize: interactive ? 22 : 14,
            cursor: interactive ? "pointer" : "default",
            color: s <= (hover || rating) ? "#f59e0b" : "var(--line)",
            transition: "color .1s",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

function shortName(name: string | null): string {
  if (!name) return "Anonymous";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function ShopReviews({ shopId, currentUserId }: ShopReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [writeDone, setWriteDone] = useState(false);

  const fetchReviews = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shops/${shopId}/reviews?page=${p}`);
      const json = await res.json() as {
        ok: boolean;
        data?: { reviews: Review[]; total: number; page: number; pages: number; averageRating: number | null };
      };
      if (json.ok && json.data) {
        setReviews(json.data.reviews);
        setTotal(json.data.total);
        setPage(json.data.page);
        setPages(json.data.pages);
        setAverageRating(json.data.averageRating);
      }
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { void fetchReviews(1); }, [fetchReviews]);

  async function handleWriteReview(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setWriteError("");
    try {
      const res = await fetch(`/api/shops/${shopId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body || undefined }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setWriteError(json.error ?? "Failed to submit review.");
        return;
      }
      setWriteDone(true);
      void fetchReviews(1);
    } catch {
      setWriteError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ fontFamily: "var(--body)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: 0, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Reviews
        </p>
        {averageRating !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Stars rating={Math.round(averageRating)} />
            <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              {averageRating.toFixed(1)} · {total} review{total !== 1 ? "s" : ""}
            </span>
          </div>
        )}
        {averageRating === null && total === 0 && (
          <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>No reviews yet</span>
        )}
      </div>

      {/* Write review form (if authenticated) */}
      {currentUserId && (
        <div style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
          {writeDone ? (
            <p style={{ fontSize: 14, color: "var(--green)", fontWeight: 600, margin: 0 }}>
              ✓ Your review has been submitted.
            </p>
          ) : (
            <form onSubmit={(e) => void handleWriteReview(e)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Write a Review</p>
              <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: 0 }}>
                You can only review shops where you have a completed order. Reviews can be edited.
              </p>
              <div>
                <Stars rating={rating} interactive onRate={setRating} />
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Share your experience (optional)"
                style={{
                  width: "100%", padding: "9px 12px", border: "1px solid var(--line)",
                  borderRadius: 8, fontSize: 14, fontFamily: "var(--body)",
                  background: "var(--paper)", color: "var(--ink)", resize: "vertical", boxSizing: "border-box",
                }}
              />
              {writeError && <p style={{ fontSize: 13, color: "var(--clay)", margin: 0 }}>{writeError}</p>}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  alignSelf: "flex-start", padding: "9px 20px", background: "var(--clay)", color: "var(--white)",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  fontFamily: "var(--body)", cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Be the first to leave a review after a completed order.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Stars rating={r.rating} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    {shortName(r.author.name)}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{formatDate(r.createdAt)}</span>
              </div>
              {r.body && (
                <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{r.body}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {page > 1 && (
            <button
              type="button"
              onClick={() => void fetchReviews(page - 1)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, cursor: "pointer", color: "var(--ink)" }}
            >
              ← Prev
            </button>
          )}
          {page < pages && (
            <button
              type="button"
              onClick={() => void fetchReviews(page + 1)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--paper)", fontSize: 13, cursor: "pointer", color: "var(--ink)" }}
            >
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
