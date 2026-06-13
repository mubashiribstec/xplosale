"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";

interface Option { id: string; text: string }
interface Question {
  id: string;
  order: number;
  kind: string;
  body: string;
  points: number;
  metadata: { options?: Option[]; multiSelect?: boolean };
}
interface Assignment {
  id: string;
  status: string;
  dueAt: string;
  startedAt: string | null;
  submittedAt: string | null;
  scorePercent: number | null;
  autoGraded: boolean;
  template: { name: string; durationMin: number; description: string | null };
  questions: Question[];
  session: { endsAt: string; focusLossCount: number; fullscreenExits: number } | null;
}

const LETTERS = ["A", "B", "C", "D", "E"];

export default function TestTakerPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = use(params);
  const router = useRouter();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [phase, setPhase] = useState<"loading" | "intro" | "taking" | "submitted">("loading");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [focusLoss, setFocusLoss] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load assignment
  useEffect(() => {
    fetch(`/api/ats/assignments/${assignmentId}`)
      .then((r) => r.json())
      .then((j: { ok: boolean; data?: Assignment }) => {
        if (!j.ok || !j.data) { setError("Assignment not found."); setPhase("intro"); return; }
        const a = j.data;
        setAssignment(a);
        if (a.status === "SUBMITTED" || a.status === "GRADED" || a.status === "PENDING_GRADE") {
          setPhase("submitted");
        } else if (a.status === "IN_PROGRESS" && a.session) {
          // Resume
          const remaining = Math.max(0, Math.floor((new Date(a.session.endsAt).getTime() - Date.now()) / 1000));
          setTimeLeft(remaining);
          setFocusLoss(a.session.focusLossCount);
          setFullscreenExits(a.session.fullscreenExits);
          setPhase("taking");
        } else {
          setPhase("intro");
        }
      });
  }, [assignmentId]);

  // Timer
  useEffect(() => {
    if (phase !== "taking") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          void handleSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Autosave every 30s
  const doAutosave = useCallback(async (currentAnswers: Record<string, string[]>) => {
    await fetch(`/api/ats/assignments/${assignmentId}/autosave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: currentAnswers }),
    });
  }, [assignmentId]);

  useEffect(() => {
    if (phase !== "taking") return;
    autosaveTimerRef.current = setInterval(() => {
      void doAutosave(answers);
    }, 30_000);
    return () => {
      if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);
    };
  }, [phase, answers, doAutosave]);

  // Focus loss detection
  useEffect(() => {
    if (phase !== "taking") return;

    async function reportEvent(kind: "focus_loss" | "fullscreen_exit") {
      const res = await fetch(`/api/ats/assignments/${assignmentId}/session-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const j = await res.json() as { ok: boolean; data?: { focusLossCount: number; fullscreenExits: number } };
      if (j.ok && j.data) {
        setFocusLoss(j.data.focusLossCount);
        setFullscreenExits(j.data.fullscreenExits);
      }
    }

    function onBlur() { void reportEvent("focus_loss"); }
    function onVisibilityChange() { if (document.hidden) void reportEvent("focus_loss"); }
    function onFullscreenChange() {
      if (!document.fullscreenElement) void reportEvent("fullscreen_exit");
    }

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [phase, assignmentId]);

  async function startTest() {
    if (!assignment) return;
    const res = await fetch(`/api/ats/assignments/${assignmentId}/start`, { method: "POST" });
    const j = await res.json() as { ok: boolean; data?: { session: { endsAt: string } }; error?: string };
    if (!j.ok) { setError(j.error ?? "Could not start test"); return; }
    const remaining = Math.max(0, Math.floor((new Date(j.data!.session.endsAt).getTime() - Date.now()) / 1000));
    setTimeLeft(remaining);

    // Load autosaved answers from server (via updated assignment)
    const aRes = await fetch(`/api/ats/assignments/${assignmentId}`);
    const aJ = await aRes.json() as { ok: boolean; data?: Assignment };
    if (aJ.ok && aJ.data) setAssignment(aJ.data);

    setPhase("taking");
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current);

    const finalAnswers: Record<string, unknown> = {};
    for (const [qId, ids] of Object.entries(answers)) {
      finalAnswers[qId] = { selectedIds: ids };
    }

    const res = await fetch(`/api/ats/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers }),
    });
    const j = await res.json() as { ok: boolean; data?: Assignment; error?: string };
    setSubmitting(false);
    if (!j.ok) { setError(j.error ?? "Submit failed"); return; }
    if (j.data) setAssignment(j.data);
    setPhase("submitted");
  }

  function toggleAnswer(qId: string, optId: string, multi: boolean) {
    setAnswers((prev) => {
      const current = prev[qId] ?? [];
      if (multi) {
        return {
          ...prev,
          [qId]: current.includes(optId)
            ? current.filter((id) => id !== optId)
            : [...current, optId],
        };
      }
      return { ...prev, [qId]: [optId] };
    });
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (phase === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <p style={{ color: "var(--ink-faint)" }}>Loading test…</p>
      </main>
    );
  }

  if (phase === "submitted") {
    const a = assignment;
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--paper)" }}>
        <div className="max-w-md w-full rounded-2xl border p-8 text-center space-y-4" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <div className="text-4xl">{a?.scorePercent != null ? "🎉" : "📋"}</div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>Test Submitted</h1>
          {a?.scorePercent != null ? (
            <p className="text-3xl font-bold" style={{ color: "var(--blue)" }}>{a.scorePercent.toFixed(0)}%</p>
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-faint)" }}>Your submission is being reviewed by the team.</p>
          )}
          {a?.autoGraded && a.scorePercent != null && (
            <p className="text-xs" style={{ color: "var(--ink-faint)" }}>Auto-graded · Score is final</p>
          )}
          <button
            onClick={() => router.push("/me/employer/jobs")}
            className="mt-4 px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (phase === "intro") {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--paper)" }}>
        <div className="max-w-lg w-full rounded-2xl border p-8 space-y-5" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>{assignment?.template.name ?? "Assessment Test"}</h1>
          {assignment?.template.description && (
            <p className="text-sm" style={{ color: "var(--ink-soft)" }}>{assignment.template.description}</p>
          )}
          <div className="text-sm space-y-1" style={{ color: "var(--ink-faint)" }}>
            <p>⏱ Time limit: <strong>{assignment?.template.durationMin} minutes</strong></p>
            <p>📝 Questions: <strong>{assignment?.questions.length}</strong></p>
            <p>📅 Due: <strong>{assignment ? new Date(assignment.dueAt).toLocaleDateString() : "—"}</strong></p>
          </div>

          <div className="rounded-lg p-3 text-xs border" style={{ background: "rgba(160,78,55,.12)", borderColor: "rgba(160,78,55,.3)", color: "var(--clay-deep)" }}>
            <strong>Transparency notice:</strong> This test records focus-loss and fullscreen-exit events as soft signals.
            Significant deviations are reviewed by a human recruiter; no auto-fail occurs based on these signals.
          </div>

          {error && <p className="text-sm" style={{ color: "#C83C28" }}>{error}</p>}

          <button
            onClick={() => void startTest()}
            className="w-full py-3 font-semibold rounded-xl transition-colors hover:opacity-90"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            Start Test
          </button>
        </div>
      </main>
    );
  }

  // Taking phase
  const questions = assignment?.questions.slice().sort((a, b) => a.order - b.order) ?? [];
  const q = questions[currentQ];
  const qAnswers = q ? (answers[q.id] ?? []) : [];
  const answered = questions.filter((q2) => (answers[q2.id]?.length ?? 0) > 0).length;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>
      {/* Top bar */}
      <header className="border-b px-4 py-3 flex items-center justify-between" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{assignment?.template.name}</p>
          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>{answered}/{questions.length} answered</p>
        </div>
        <div className="flex items-center gap-4">
          {(focusLoss > 0 || fullscreenExits > 0) && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(160,78,55,.12)", color: "var(--clay)" }}>
              Focus events: {focusLoss + fullscreenExits}
            </span>
          )}
          <span className="text-sm font-mono font-bold" style={{ color: timeLeft < 60 ? "#C83C28" : "var(--ink-soft)" }}>
            {formatTime(timeLeft)}
          </span>
          <button
            onClick={() => { if (confirm("Submit the test now?")) void handleSubmit(); }}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: "var(--clay)", color: "var(--white)" }}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex max-w-4xl mx-auto w-full">
        {/* Question nav sidebar */}
        <aside className="w-16 border-r flex flex-col items-center py-4 gap-2 overflow-y-auto" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
          {questions.map((q2, i) => {
            const isCurrent = i === currentQ;
            const isAnswered = (answers[q2.id]?.length ?? 0) > 0;
            const navStyle = isCurrent
              ? { background: "var(--clay)", color: "var(--white)" }
              : isAnswered
              ? { background: "rgba(14,158,110,.12)", color: "var(--green)" }
              : { background: "var(--paper-2)", color: "var(--ink-faint)" };
            return (
              <button
                key={q2.id}
                onClick={() => setCurrentQ(i)}
                className="w-9 h-9 rounded-full text-xs font-medium transition-colors hover:opacity-80"
                style={navStyle}
              >
                {i + 1}
              </button>
            );
          })}
        </aside>

        {/* Question area */}
        {q && (
          <div className="flex-1 p-8 space-y-6">
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--ink-faint)" }}>Question {currentQ + 1} of {questions.length} · {q.points} pt{q.points !== 1 ? "s" : ""}</p>
              <p className="text-base font-medium leading-relaxed" style={{ color: "var(--ink)" }}>{q.body}</p>
              {q.metadata.multiSelect && (
                <p className="text-xs mt-1" style={{ color: "var(--ink-faint)" }}>Select all that apply</p>
              )}
            </div>

            <div className="space-y-3">
              {(q.metadata.options ?? []).map((opt, oi) => {
                const selected = qAnswers.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleAnswer(q.id, opt.id, q.metadata.multiSelect ?? false)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors hover:opacity-90"
                    style={
                      selected
                        ? { borderColor: "var(--blue)", background: "rgba(50,122,214,.08)", color: "var(--blue-deep)" }
                        : { borderColor: "var(--line)", background: "var(--white)", color: "var(--ink-soft)" }
                    }
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={selected ? { background: "var(--clay)", color: "var(--white)" } : { background: "var(--paper-2)", color: "var(--ink-faint)" }}
                    >
                      {LETTERS[oi]}
                    </span>
                    <span className="text-sm">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setCurrentQ((i) => Math.max(0, i - 1))}
                disabled={currentQ === 0}
                className="px-4 py-2 text-sm rounded-lg border disabled:opacity-40 hover:opacity-80"
                style={{ color: "var(--ink-soft)", borderColor: "var(--line)" }}
              >
                ← Previous
              </button>
              {currentQ < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ((i) => i + 1)}
                  className="px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-90"
                  style={{ background: "var(--clay)", color: "var(--white)" }}
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => { if (confirm("Submit the test now?")) void handleSubmit(); }}
                  disabled={submitting}
                  className="px-4 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors hover:opacity-90"
                  style={{ background: "var(--green)", color: "var(--white)" }}
                >
                  Submit Test
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
