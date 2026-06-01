"use client";

import { useEffect, useRef, useState } from "react";
import NoteThread from "./NoteThread";

type Tag = { id: string; name: string; color: string };
type Stage = { id: string; name: string; color: string };
type TeamMember = { id: string; role: string; user: { id: string; name: string | null; networkProfile: { handle: string; profilePhotoUrl: string | null } | null } };

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
        className="relative z-50 w-full max-w-lg bg-white shadow-2xl h-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            {loading ? (
              <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <p className="font-semibold text-gray-900 truncate">
                  {app?.jobSeeker.user.name ?? "Applicant"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {app?.jobPosting.title}
                </p>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(["profile", "notes", "tests", "interviews"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`mr-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
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
                <span className="text-xs text-gray-400">Applied {new Date(app.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Candidate info */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                {app.jobSeeker.headline && <p className="text-gray-700 font-medium">{app.jobSeeker.headline}</p>}
                {app.jobSeeker.currentRoleTitle && <p className="text-gray-500">{app.jobSeeker.currentRoleTitle}</p>}
                {app.jobSeeker.user.email && (
                  <p className="text-gray-500">
                    <a href={`mailto:${app.jobSeeker.user.email}`} className="hover:underline text-blue-600">
                      {app.jobSeeker.user.email}
                    </a>
                  </p>
                )}
                {app.jobSeeker.user.phone && <p className="text-gray-500">{app.jobSeeker.user.phone}</p>}
                {(app.jobSeeker.expectedSalaryMin ?? app.jobSeeker.expectedSalaryMax) && (
                  <p className="text-gray-500">
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
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View resume (60s link)
              </a>

              {/* Cover letter */}
              {app.coverLetter && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Cover letter</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{app.coverLetter}</p>
                </div>
              )}

              {/* Tags */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Tags</p>
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
                        className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
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
                  className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Send email
                </button>
              ) : (
                <div className="border border-blue-100 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Send email template</p>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {emailMsg && (
                    <p className={`text-xs ${emailMsg.startsWith("Email") ? "text-green-600" : "text-red-600"}`}>{emailMsg}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowEmailPanel(false); setEmailMsg(null); }}
                      className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendEmail()}
                      disabled={!selectedTemplateId || sendingEmail}
                      className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
                handle: m.user.networkProfile?.handle ?? null,
              }))}
            />
          )}

          {!loading && tab === "tests" && app && (
            <TestsTab applicationId={app.id} companyId={companyId} />
          )}

          {!loading && tab === "interviews" && (
            <div className="py-12 text-center text-sm text-gray-400">
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

  const STATUS_COLORS: Record<string, string> = {
    ASSIGNED: "bg-blue-50 text-blue-600",
    IN_PROGRESS: "bg-yellow-50 text-yellow-700",
    SUBMITTED: "bg-purple-50 text-purple-700",
    PENDING_GRADE: "bg-orange-50 text-orange-600",
    GRADED: "bg-green-100 text-green-700",
    EXPIRED: "bg-gray-100 text-gray-500",
  };

  if (loading) return <p className="py-8 text-center text-sm text-gray-400">Loading…</p>;

  const defaultDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Assessment Tests</p>
        {!showAssign && templates.length > 0 && (
          <button
            onClick={() => { setShowAssign(true); setDueAt(defaultDue); }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            + Assign Test
          </button>
        )}
      </div>

      {showAssign && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
          <p className="text-sm font-medium text-gray-800">Assign a test</p>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select a published test…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.durationMin} min)</option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Due date</label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => void assign()}
              disabled={assigning || !selectedTemplate || !dueAt}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {assigning ? "Assigning…" : "Assign"}
            </button>
            <button
              onClick={() => { setShowAssign(false); setError(null); }}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 && !loading && (
        <p className="text-sm text-gray-400">
          No published tests yet.{" "}
          <a href={`/employer/${companyId}/tests`} className="text-blue-600 hover:underline">
            Create one →
          </a>
        </p>
      )}

      {assignments.length === 0 && templates.length > 0 && !showAssign && (
        <p className="text-sm text-gray-400">No tests assigned yet.</p>
      )}

      <div className="space-y-2">
        {assignments.map((a) => (
          <div key={a.id} className="border border-gray-100 rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800">{a.template.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                {a.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Due: {new Date(a.dueAt).toLocaleDateString()}
              {a.scorePercent != null && (
                <> · Score: <strong className={a.scorePercent >= 70 ? "text-green-600" : "text-red-500"}>{a.scorePercent.toFixed(0)}%</strong></>
              )}
              {a.autoGraded && " · Auto-graded"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
