"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface QAQuestion {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  asker: { name: string | null };
}

interface ListingQAProps {
  listingId: string;
  sellerUserId: string;
  initialQuestions: QAQuestion[];
}

export default function ListingQA({ listingId, sellerUserId, initialQuestions }: ListingQAProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [questions, setQuestions] = useState<QAQuestion[]>(initialQuestions);

  // Ask form state
  const [askText, setAskText] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // Answer form state per question
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerLoading, setAnswerLoading] = useState<Record<string, boolean>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});

  // Accordion open state for answered questions
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const userId = (session?.user as { id?: string } | undefined)?.id;
  const isSeller = !!userId && userId === sellerUserId;

  const answeredQuestions = questions.filter((q) => q.answer !== null);
  const unansweredQuestions = questions.filter((q) => q.answer === null);

  function toggleAccordion(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitAnswer(questionId: string) {
    const answer = answerDrafts[questionId]?.trim();
    if (!answer) return;

    setAnswerLoading((prev) => ({ ...prev, [questionId]: true }));
    setAnswerErrors((prev) => ({ ...prev, [questionId]: "" }));

    try {
      const res = await fetch(`/api/listings/${listingId}/questions/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });

      const json = (await res.json()) as { ok: boolean; data?: QAQuestion; error?: string };

      if (!res.ok || !json.ok) {
        setAnswerErrors((prev) => ({
          ...prev,
          [questionId]: json.error ?? "Failed to submit answer.",
        }));
        return;
      }

      // Update question in state
      const answeredAt = new Date().toISOString();
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, answer, answeredAt } : q
        )
      );
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
    } catch {
      setAnswerErrors((prev) => ({
        ...prev,
        [questionId]: "Network error. Please try again.",
      }));
    } finally {
      setAnswerLoading((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const question = askText.trim();
    if (!question) return;

    if (!userId) {
      router.push(`/login?redirect=/m/${listingId}`);
      return;
    }

    setAskLoading(true);
    setAskError(null);

    try {
      const res = await fetch(`/api/listings/${listingId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (res.status === 409) {
        setAskError("You have already asked a question on this listing.");
        setAskLoading(false);
        return;
      }

      if (res.status === 429) {
        setAskError("You have reached the question limit for today.");
        setAskLoading(false);
        return;
      }

      const json = (await res.json()) as { ok: boolean; data?: QAQuestion; error?: string };

      if (!res.ok || !json.ok) {
        setAskError(json.error ?? "Failed to submit question.");
        setAskLoading(false);
        return;
      }

      // Optimistically add as pending unanswered question
      const newQuestion: QAQuestion = json.data ?? {
        id: crypto.randomUUID(),
        question,
        answer: null,
        answeredAt: null,
        asker: { name: session?.user?.name ?? null },
      };
      setQuestions((prev) => [newQuestion, ...prev]);
      setAskText("");
    } catch {
      setAskError("Network error. Please try again.");
    } finally {
      setAskLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--display)]">Questions &amp; Answers</h2>

      {/* Seller: unanswered questions at top */}
      {isSeller && unansweredQuestions.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--ink)]">Awaiting your answer</p>
          {unansweredQuestions.map((q) => (
            <div
              key={q.id}
              className="border border-[var(--line)] rounded-xl p-4 space-y-3 bg-amber-50"
            >
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">{q.question}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Asked by {q.asker.name ?? "Anonymous"}
                </p>
              </div>
              <textarea
                value={answerDrafts[q.id] ?? ""}
                onChange={(e) =>
                  setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                rows={3}
                maxLength={500}
                placeholder="Write your answer…"
                className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-sm bg-[var(--paper)] text-[var(--body)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)] resize-none"
              />
              {answerErrors[q.id] && (
                <p className="text-xs text-red-500">{answerErrors[q.id]}</p>
              )}
              <button
                type="button"
                onClick={() => void submitAnswer(q.id)}
                disabled={answerLoading[q.id] || !answerDrafts[q.id]?.trim()}
                className="px-4 py-2 text-sm font-medium bg-[var(--ink)] text-[var(--white)] rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {answerLoading[q.id] ? "Submitting…" : "Post answer"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Answered questions accordion */}
      {answeredQuestions.length > 0 && (
        <div className="space-y-2">
          {answeredQuestions.map((q) => (
            <div
              key={q.id}
              className="border border-[var(--line)] rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleAccordion(q.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--clay)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--ink)] pr-4">{q.question}</span>
                <span className="text-gray-400 flex-shrink-0 text-xs">
                  {openIds.has(q.id) ? "▲" : "▼"}
                </span>
              </button>
              {openIds.has(q.id) && (
                <div className="px-4 pb-4 text-sm text-[var(--body)] border-t border-[var(--line)] pt-3 bg-[var(--paper)]">
                  {q.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Non-seller unanswered questions (just show them as pending) */}
      {!isSeller && unansweredQuestions.length > 0 && (
        <div className="space-y-2">
          {unansweredQuestions.map((q) => (
            <div
              key={q.id}
              className="border border-[var(--line)] rounded-xl px-4 py-3 opacity-60"
            >
              <p className="text-sm text-[var(--body)]">{q.question}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting answer</p>
            </div>
          ))}
        </div>
      )}

      {questions.length === 0 && (
        <p className="text-sm text-gray-400">No questions yet. Be the first to ask!</p>
      )}

      {/* Ask a question form */}
      {!isSeller && (
        <div className="pt-2 border-t border-[var(--line)]">
          <h3 className="text-sm font-semibold text-[var(--ink)] mb-3">Ask a question</h3>
          {userId ? (
            <form onSubmit={(e) => void submitQuestion(e)} className="space-y-2">
              <textarea
                value={askText}
                onChange={(e) => setAskText(e.target.value)}
                rows={3}
                minLength={5}
                maxLength={500}
                placeholder="What would you like to know about this listing?"
                className="w-full px-3 py-2 border border-[var(--line)] rounded-lg text-sm bg-[var(--paper)] text-[var(--body)] focus:outline-none focus:ring-2 focus:ring-[var(--ink)] resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{askText.length}/500</span>
                {askError && <p className="text-xs text-red-500">{askError}</p>}
                <button
                  type="submit"
                  disabled={askLoading || askText.trim().length < 5}
                  className="px-4 py-2 text-sm font-medium bg-[var(--ink)] text-[var(--white)] rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity"
                >
                  {askLoading ? "Sending…" : "Ask"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              <Link
                href={`/login?redirect=/m/${listingId}`}
                className="underline hover:text-[var(--ink)] transition-colors"
              >
                Log in to ask a question
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
