"use client";

import { useEffect, useRef, useState } from "react";
import NoteThread from "./NoteThread";

type Tag = { id: string; name: string; color: string };
type Stage = { id: string; name: string; color: string };
type TeamMember = { id: string; role: string; user: { id: string; name: string | null } };

type Application = {
  id: string;
  status: string;
  createdAt: string;
  resumeUrl: string;
  coverLetter: string | null;
  currentStage: Stage | null;
  applicationTags: { tag: Tag }[];
  jobPosting: { id: string; title: string; companyId: string };
  jobSeeker: {
    headline: string | null;
    summary: string | null;
    currentRoleTitle: string | null;
    expectedSalaryMin: number | null;
    expectedSalaryMax: number | null;
    currency: string | null;
    user: { id: string; name: string | null; email: string | null; phone: string | null };
  };
};

type EmailTemplate = { id: string; name: string; subject: string; body: string; kind: string };

type Props = {
  applicationId: string | null;
  companyId: string;
  onClose: () => void;
};

type Tab = "profile" | "notes" | "tests" | "interviews";

export default function CandidateDrawer({ applicationId, companyId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("profile");
  const [app, setApp] = useState<Application | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  // Track current applicationId to discard stale async responses
  const currentAppIdRef = useRef<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!applicationId) { setApp(null); return; }
    currentAppIdRef.current = applicationId;
    setLoading(true);
    setTab("profile");
    setShowEmailPanel(false);
    setTeam([]);

    Promise.all([
      fetch(`/api/ats/applications/${applicationId}`).then((r) => r.json()),
      fetch(`/api/ats/templates?companyId=${companyId}`).then((r) => r.json()),
    ]).then(([appRes, tmplRes]: [{ ok: boolean; data?: Application }, { ok: boolean; data?: EmailTemplate[] }]) => {
      if (currentAppIdRef.current !== applicationId) return; // stale response
      if (appRes.ok && appRes.data) {
        setApp(appRes.data);
        const jobId = appRes.data.jobPosting.id;
        fetch(`/api/ats/team/${jobId}`)
          .then((r) => r.json())
          .then((d: { ok: boolean; data?: TeamMember[] }) => {
            if (currentAppIdRef.current !== applicationId) return; // stale response
            if (d.ok && d.data) setTeam(d.data);
          });
      }
      if (tmplRes.ok && tmplRes.data) setTemplates(tmplRes.data);
    }).finally(() => {
      if (currentAppIdRef.current === applicationId) setLoading(false);
    });

    fetch(`/api/ats/tags?companyId=${companyId}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; data?: Tag[] }) => {
        if (currentAppIdRef.current !== applicationId) return; // stale / drawer changed
        if (d.ok && d.data) setTags(d.data);
      })
      .catch(() => {});
  }, [applicationId, companyId]);

  async function sendEmail() {
    if (!app || !selectedTemplateId) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;
    setSendingEmail(true);
    setEmailMsg(null);

    const res = await fetch("/api/ats/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: app.id,
        templateId: template.id,
        subject: template.subject,
        body: template.body,
      }),
    });
    const json = (await res.json()) as { ok: boolean; data?: { status: string }; error?: string };
    setSendingEmail(false);
    setEmailMsg(res.ok ? `Email sent (${json.data?.status ?? "ok"})` : (json.error ?? "Failed to send"));
  }

  async function removeTag(tagId: string) {
    if (!app) return;
    await fetch(`/api/ats/applications/${app.id}/tags/${tagId}`, { method: "DELETE" });
    setApp((prev) => prev ? { ...prev, applicationTags: prev.applicationTags.filter((t) => t.tag.id !== tagId) } : prev);
  }

  async function applyTag(tagId: string) {
    if (!app) return;
    const res = await fetch(`/api/ats/applications/${app.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    const json = (await res.json()) as { ok: boolean; data?: { tag: Tag } };
    if (res.ok && json.data) {
      setApp((prev) => prev ? { ...prev, applicationTags: [...prev.applicationTags, json.data!] } : prev);
    }
  }

  if (!applicationId) return null;

  const appliedTagIds = new Set(app?.applicationTags.map((t) => t.tag.id) ?? []);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Drawer */}
      <div
        className="relative z-50 w-full max-w-lg shadow-2xl h-full flex flex-col overflow-hidden"
        style={{ background: "var(--white)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="min-w-0">
            {loading ? (
              <div className="h-5 w-40 rounded animate-pulse" style={{ background: "var(--paper-2)" }} />
            ) : (
              <>
                <p className="font-semibold truncate" style={{ color: "var(--ink)" }}>
                  {app?.jobSeeker.user.name ?? "Applicant"}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--ink-faint)" }}>
                  {app?.jobPosting.title}
                </p>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} className="flex-shrink-0" style={{ color: "var(--ink-faint)" }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-5" style={{ borderColor: "var(--line)" }}>
          {(["profile", "notes", "tests", "interviews"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="mr-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize"
              style={
                tab === t
                  ? { borderColor: "var(--clay)", color: "var(--clay)" }
                  : { borderColor: "transparent", color: "var(--ink-faint)" }
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 rounded w-3/4" style={{ background: "var(--paper-2)" }} />
              <div className="h-4 rounded w-1/2" style={{ background: "var(--paper-2)" }} />
              <div className="h-4 rounded w-2/3" style={{ background: "var(--paper-2)" }} />
            </div>
          )}

          {!loading && app && tab === "profile" && (
            <>
              {/* Stage + status */}
              <div className="flex items-center gap-2 flex-wrap">
                {app.currentStage && (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${app.currentStage.color}22`, color: app.currentStage.color }}
                  >
                    {app.currentStage.name}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Applied {new Date(app.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Candidate info */}
              <div className="rounded-xl p-3 space-y-1.5 text-sm" style={{ background: "var(--paper)" }}>
                {app.jobSeeker.headline && <p className="font-medium" style={{ color: "var(--ink-soft)" }}>{app.jobSeeker.headline}</p>}
                {app.jobSeeker.currentRoleTitle && <p style={{ color: "var(--ink-faint)" }}>{app.jobSeeker.currentRoleTitle}</p>}
                {app.jobSeeker.user.email && (
                  <p style={{ color: "var(--ink-faint)" }}>
                    <a href={`mailto:${app.jobSeeker.user.email}`} className="hover:underline" style={{ color: "var(--blue)" }}>
                      {app.jobSeeker.user.email}
                    </a>
                  </p>
                )}
                {app.jobSeeker.user.phone && <p style={{ color: "var(--ink-faint)" }}>{app.jobSeeker.user.phone}</p>}
                {(app.jobSeeker.expectedSalaryMin ?? app.jobSeeker.expectedSalaryMax) && (
                  <p style={{ color: "var(--ink-faint)" }}>
                    Expected: {app.jobSeeker.currency ?? "PKR"}{" "}
                    {app.jobSeeker.expectedSalaryMin?.toLocaleString() ?? "?"} –{" "}
                    {app.jobSeeker.expectedSalaryMax?.toLocaleString() ?? "?"}
                  </p>
                )}
              </div>

              {/* Resume */}
              <a
                href={app.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
                style={{ color: "var(--blue)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View resume (60s link)
              </a>

              {/* Cover letter */}
              {app.coverLetter && (
                <div>
                  <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>Cover letter</p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--ink-soft)" }}>{app.coverLetter}</p>
                </div>
              )}

              {/* Tags */}
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {app.applicationTags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => void removeTag(tag.id)}
                        className="opacity-60 hover:opacity-100"
                      >×</button>
                    </span>
                  ))}
                  {tags
                    .filter((t) => !appliedTagIds.has(t.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => void applyTag(tag.id)}
                        className="text-xs px-2 py-0.5 rounded-full border border-dashed transition-colors"
                        style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}
                      >
                        + {tag.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Send email */}
              {!showEmailPanel ? (
                <button
                  type="button"
                  onClick={() => setShowEmailPanel(true)}
                  className="w-full py-2 rounded-xl text-sm border transition-colors hover:opacity-80"
                  style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
                >
                  Send email
                </button>
              ) : (
                <div className="rounded-xl p-3 space-y-2 border" style={{ borderColor: "rgba(50,122,214,.3)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-faint)" }}>Send email template</p>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
                    style={{ borderColor: "var(--line)", background: "var(--white)", color: "var(--ink)" }}
                  >
                    <option value="">Select template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {emailMsg && (
                    <p className="text-xs" style={{ color: emailMsg.startsWith("Email") ? "var(--green-deep)" : "#C83C28" }}>{emailMsg}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowEmailPanel(false); setEmailMsg(null); }}
                      className="flex-1 py-1.5 rounded-lg text-xs border hover:opacity-80"
                      style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendEmail()}
                      disabled={!selectedTemplateId || sendingEmail}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                      style={{ background: "var(--clay)", color: "var(--white)" }}
                    >
                      {sendingEmail ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && tab === "notes" && (
            <NoteThread
              applicationId={applicationId}
              team={team.map((m) => ({
                id: m.user.id,
                name: m.user.name,
              }))}
            />
          )}

          {!loading && tab === "tests" && app && (
            <TestsTab applicationId={app.id} companyId={companyId} />
          )}

          {!loading && tab === "interviews" && (
            <div className="py-12 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
              Coming in Phase 21.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tests Tab ────────────────────────────────────────────────────────────────

interface TestAssignment {
  id: string;
  status: string;
  dueAt: string;
  scorePercent: number | null;
  autoGraded: boolean;
  template: { id: string; name: string; durationMin: number };
}

interface TestTemplate {
  id: string;
  name: string;
  durationMin: number;
  isPublished: boolean;
}

function TestsTab({ applicationId, companyId }: { applicationId: string; companyId: string }) {
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultDueState] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16));

  useEffect(() => {
    Promise.all([
      fetch(`/api/ats/assignments?applicationId=${applicationId}`).then((r) => r.json()),
      fetch(`/api/ats/tests?companyId=${companyId}`).then((r) => r.json()),
    ]).then(([aRes, tRes]) => {
      if ((aRes as { ok: boolean; data?: TestAssignment[] }).ok) setAssignments((aRes as { ok: boolean; data: TestAssignment[] }).data);
      if ((tRes as { ok: boolean; data?: TestTemplate[] }).ok) {
        setTemplates(((tRes as { ok: boolean; data: TestTemplate[] }).data).filter((t) => t.isPublished));
      }
      setLoading(false);
    });
  }, [applicationId, companyId]);

  async function assign() {
    if (!selectedTemplate || !dueAt) return;
    setAssigning(true);
    setError(null);
    const res = await fetch("/api/ats/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, templateId: selectedTemplate, dueAt }),
    });
    const j = await res.json() as { ok: boolean; data?: TestAssignment; error?: string };
    setAssigning(false);
    if (!j.ok) { setError(j.error ?? "Failed"); return; }
    if (j.data) setAssignments((p) => [...p, j.data!]);
    setShowAssign(false);
    setSelectedTemplate("");
    setDueAt("");
  }

  const STATUS_COLORS: Record<string, { background: string; color: string }> = {
    ASSIGNED: { background: "rgba(50,122,214,.12)", color: "var(--blue)" },
    IN_PROGRESS: { background: "rgba(160,78,55,.12)", color: "var(--clay)" },
    SUBMITTED: { background: "rgba(50,122,214,.12)", color: "var(--blue)" },
    PENDING_GRADE: { background: "rgba(160,78,55,.12)", color: "var(--clay)" },
    GRADED: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
    EXPIRED: { background: "var(--paper-2)", color: "var(--ink-soft)" },
  };

  if (loading) return <p className="py-8 text-center text-sm" style={{ color: "var(--ink-faint)" }}>Loading…</p>;

  // Lazy one-time default (7 days out); avoids calling Date.now() during render.
  const defaultDue = defaultDueState;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>Assessment Tests</p>
        {!showAssign && templates.length > 0 && (
          <button
            onClick={() => { setShowAssign(true); setDueAt(defaultDue); }}
            className="text-xs font-medium hover:opacity-80"
            style={{ color: "var(--blue)" }}
          >
            + Assign Test
          </button>
        )}
      </div>

      {showAssign && (
        <div className="rounded-lg p-4 space-y-3 border" style={{ borderColor: "rgba(50,122,214,.3)", background: "rgba(50,122,214,.08)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>Assign a test</p>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
            style={{ borderColor: "var(--line)", background: "var(--white)", color: "var(--ink)" }}
          >
            <option value="">Select a published test…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.durationMin} min)</option>
            ))}
          </select>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--ink-faint)" }}>Due date</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none"
              style={{ borderColor: "var(--line)", background: "var(--white)", color: "var(--ink)" }}
            />
          </div>
          {error && <p className="text-xs" style={{ color: "#C83C28" }}>{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void assign()}
              disabled={assigning || !selectedTemplate || !dueAt}
              className="px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
              style={{ background: "var(--clay)", color: "var(--white)" }}
            >
              {assigning ? "Assigning…" : "Assign"}
            </button>
            <button
              onClick={() => { setShowAssign(false); setError(null); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:opacity-80"
              style={{ background: "var(--paper-2)", color: "var(--ink-soft)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !loading && (
        <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
          No published tests yet.{" "}
          <a href={`/employer/${companyId}/tests`} className="hover:underline" style={{ color: "var(--blue)" }}>
            Create one →
          </a>
        </p>
      )}

      {assignments.length === 0 && templates.length > 0 && !showAssign && (
        <p className="text-sm" style={{ color: "var(--ink-faint)" }}>No tests assigned yet.</p>
      )}

      <div className="space-y-2">
        {assignments.map((a) => (
          <div key={a.id} className="rounded-lg p-3 space-y-1 border" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium" style={{ color: "var(--ink-soft)" }}>{a.template.name}</p>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={STATUS_COLORS[a.status] ?? { background: "var(--paper-2)", color: "var(--ink-faint)" }}
              >
                {a.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
              Due: {new Date(a.dueAt).toLocaleDateString()}
              {a.scorePercent != null && (
                <> · Score: <strong style={{ color: a.scorePercent >= 70 ? "var(--green)" : "#C83C28" }}>{a.scorePercent.toFixed(0)}%</strong></>
              )}
              {a.autoGraded && " · Auto-graded"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
