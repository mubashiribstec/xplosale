"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import CandidateDrawer from "./CandidateDrawer";
import InviteButton from "@/components/shared/InviteButton";

type Stage = {
  id: string;
  name: string;
  color: string;
  isInitial: boolean;
  isHired: boolean;
  isRejected: boolean;
  order: number;
};

type Tag = { id: string; name: string; color: string };

type MatchInfo = {
  score: number;
  requiredMatched: number;
  requiredTotal: number;
  matchedTerms: string[];
  missedTerms: string[];
};

type Application = {
  id: string;
  currentStageId: string | null;
  status: string;
  createdAt: string;
  coverLetter: string | null;
  jobSeeker: {
    id: string;
    headline: string | null;
    user: { id: string; name: string | null };
  };
  currentStage: Stage | null;
  applicationTags: { tag: Tag }[];
  match: MatchInfo | null;
};

type EmailTemplate = { id: string; name: string; subject: string; body: string; kind: string };

type PipelineBoardProps = {
  jobId: string;
  companyId: string;
  jobTitle: string;
  stages: Stage[];
  applications: Application[];
  fallbackStageMap: Record<string, string>;
  tags: Tag[];
};

export default function PipelineBoard({
  jobId,
  companyId,
  jobTitle,
  stages,
  applications: initial,
  fallbackStageMap,
  tags,
}: PipelineBoardProps) {
  const [apps, setApps] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openAppId, setOpenAppId] = useState<string | null>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [sortByMatch, setSortByMatch] = useState(false);
  const [hoverMatchId, setHoverMatchId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkStageId, setBulkStageId] = useState("");
  const [bulkTagId, setBulkTagId] = useState("");
  const [bulkTemplates, setBulkTemplates] = useState<EmailTemplate[]>([]);
  const [bulkTemplateId, setBulkTemplateId] = useState("");
  const [bulking, setBulking] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const getStageId = useCallback(
    (app: Application) => app.currentStageId ?? fallbackStageMap[app.id] ?? stages[0]?.id,
    [fallbackStageMap, stages]
  );

  const hasAnyMatch = apps.some((a) => a.match !== null);

  const filteredApps = (() => {
    let list = filterTagId
      ? apps.filter((a) => a.applicationTags.some((t) => t.tag.id === filterTagId))
      : apps;
    if (sortByMatch) {
      list = [...list].sort((a, b) => (b.match?.score ?? -1) - (a.match?.score ?? -1));
    }
    return list;
  })();

  async function handleDrop(stageId: string) {
    if (!dragging) return;
    const appId = dragging;
    const draggedApp = apps.find((a) => a.id === appId);
    if (!draggedApp || getStageId(draggedApp) === stageId) {
      setDragging(null);
      return;
    }
    setMoving(appId);
    setError(null);

    const res = await fetch(`/api/ats/applications/${appId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    setMoving(null);
    setDragging(null);
    if (res.ok) {
      setApps((prev) =>
        prev.map((a) =>
          a.id === appId
            ? { ...a, currentStageId: stageId, currentStage: stages.find((s) => s.id === stageId) ?? null }
            : a
        )
      );
    } else {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Move failed");
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function fetchBulkTemplates() {
    if (bulkTemplates.length > 0) return;
    const res = await fetch(`/api/ats/templates?companyId=${companyId}`);
    const json = (await res.json()) as { ok: boolean; data?: EmailTemplate[] };
    if (json.ok && json.data) setBulkTemplates(json.data);
  }

  async function executeBulk() {
    if (!bulkAction || selected.size === 0) return;
    setBulking(true);
    setBulkMsg(null);

    const applicationIds = [...selected];
    let body: object;

    if (bulkAction === "MOVE_STAGE" && bulkStageId) {
      body = { action: "MOVE_STAGE", companyId, applicationIds, stageId: bulkStageId };
    } else if (bulkAction === "ADD_TAG" && bulkTagId) {
      body = { action: "ADD_TAG", companyId, applicationIds, tagId: bulkTagId };
    } else if (bulkAction === "SEND_EMAIL" && bulkTemplateId) {
      body = { action: "SEND_EMAIL", companyId, applicationIds, templateId: bulkTemplateId };
    } else if (bulkAction === "REJECT_WITH_TEMPLATE" && bulkTemplateId) {
      body = { action: "REJECT_WITH_TEMPLATE", companyId, applicationIds, templateId: bulkTemplateId };
    } else {
      setBulkMsg("Please fill all required fields for this action.");
      setBulking(false);
      return;
    }

    const res = await fetch("/api/ats/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    setBulking(false);

    if (res.ok) {
      setBulkMsg(`Done — ${selected.size} application(s) updated.`);
      setSelected(new Set());
      // Refresh page to reflect new state
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setBulkMsg(json.error ?? "Bulk action failed");
    }
  }

  const appsByStage = stages.reduce<Record<string, Application[]>>((acc, s) => {
    acc[s.id] = filteredApps.filter((a) => getStageId(a) === s.id);
    return acc;
  }, {});

  return (
    <>
      {/* Drawer */}
      <CandidateDrawer
        applicationId={openAppId}
        companyId={companyId}
        onClose={() => setOpenAppId(null)}
      />

      <div className="space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--ink)" }}>{jobTitle}</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--ink-faint)" }}>{apps.length} total applicants</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {hasAnyMatch && (
              <button
                type="button"
                onClick={() => setSortByMatch((v) => !v)}
                className="text-xs px-2 py-1 rounded border transition-colors"
                style={
                  sortByMatch
                    ? { background: "var(--clay)", color: "var(--white)", borderColor: "var(--clay)" }
                    : { borderColor: "var(--line)", color: "var(--ink-faint)" }
                }
              >
                {sortByMatch ? "✓ Sort: Match" : "Sort by Match"}
              </button>
            )}
            <Link
              href={`/employer/${companyId}/jobs/${jobId}/team`}
              className="text-xs rounded px-2 py-1 border"
              style={{ color: "var(--ink-faint)", borderColor: "var(--line)" }}
            >
              Manage team
            </Link>
            <Link
              href={`/employer/${companyId}/pipeline-settings`}
              className="text-xs rounded px-2 py-1 border"
              style={{ color: "var(--ink-faint)", borderColor: "var(--line)" }}
            >
              Pipeline settings
            </Link>
            <Link
              href={`/employer/${companyId}/templates`}
              className="text-xs rounded px-2 py-1 border"
              style={{ color: "var(--ink-faint)", borderColor: "var(--line)" }}
            >
              Email templates
            </Link>
          </div>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Filter by tag:</span>
            <button
              type="button"
              onClick={() => setFilterTagId(null)}
              className="text-xs px-2 py-0.5 rounded-full border transition-colors"
              style={
                !filterTagId
                  ? { background: "var(--ink)", color: "var(--white)", borderColor: "var(--ink)" }
                  : { borderColor: "var(--line)", color: "var(--ink-faint)" }
              }
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setFilterTagId(tag.id === filterTagId ? null : tag.id)}
                className="text-xs px-2 py-0.5 rounded-full border transition-colors"
                style={
                  filterTagId === tag.id
                    ? { backgroundColor: tag.color, borderColor: tag.color, color: "#fff" }
                    : { borderColor: `${tag.color}66`, color: tag.color }
                }
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm px-3 py-2 rounded-lg" style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}>{error}</div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap border"
            style={{ background: "rgba(50,122,214,.08)", borderColor: "rgba(50,122,214,.3)" }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--blue-deep)" }}>{selected.size} selected</span>
            <select
              value={bulkAction}
              onChange={async (e) => {
                setBulkAction(e.target.value);
                if (e.target.value === "SEND_EMAIL" || e.target.value === "REJECT_WITH_TEMPLATE") {
                  await fetchBulkTemplates();
                }
              }}
              className="text-sm rounded-lg px-2 py-1 border focus:outline-none"
              style={{ borderColor: "rgba(50,122,214,.3)", background: "var(--white)", color: "var(--ink)" }}
            >
              <option value="">Choose action…</option>
              <option value="MOVE_STAGE">Move to stage</option>
              <option value="ADD_TAG">Add tag</option>
              <option value="SEND_EMAIL">Send email</option>
              <option value="REJECT_WITH_TEMPLATE">Reject with email</option>
            </select>

            {bulkAction === "MOVE_STAGE" && (
              <select value={bulkStageId} onChange={(e) => setBulkStageId(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 border focus:outline-none"
                style={{ borderColor: "rgba(50,122,214,.3)", background: "var(--white)", color: "var(--ink)" }}>
                <option value="">Select stage…</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {bulkAction === "ADD_TAG" && (
              <select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 border focus:outline-none"
                style={{ borderColor: "rgba(50,122,214,.3)", background: "var(--white)", color: "var(--ink)" }}>
                <option value="">Select tag…</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            {(bulkAction === "SEND_EMAIL" || bulkAction === "REJECT_WITH_TEMPLATE") && (
              <select value={bulkTemplateId} onChange={(e) => setBulkTemplateId(e.target.value)}
                className="text-sm rounded-lg px-2 py-1 border focus:outline-none"
                style={{ borderColor: "rgba(50,122,214,.3)", background: "var(--white)", color: "var(--ink)" }}>
                <option value="">Select template…</option>
                {bulkTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            {bulkMsg && (
              <span className="text-xs" style={{ color: bulkMsg.startsWith("Done") ? "var(--green-deep)" : "#C83C28" }}>{bulkMsg}</span>
            )}

            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => { setSelected(new Set()); setBulkAction(""); setBulkMsg(null); }}
                className="text-sm" style={{ color: "var(--ink-faint)" }}>
                Clear
              </button>
              <button type="button" onClick={() => void executeBulk()} disabled={bulking}
                className="text-sm px-3 py-1 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: "var(--clay)", color: "var(--white)" }}>
                {bulking ? "Working…" : "Apply"}
              </button>
            </div>
          </div>
        )}

        {/* Kanban */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${stages.length * 220}px` }}>
            {stages.map((stage) => {
              const stageApps = appsByStage[stage.id] ?? [];
              return (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-52"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => void handleDrop(stage.id)}
                >
                  <div
                    className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg"
                    style={{ backgroundColor: `${stage.color}18` }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--ink-soft)" }}>{stage.name}</span>
                    <span className="ml-auto text-xs" style={{ color: "var(--ink-faint)" }}>{stageApps.length}</span>
                  </div>

                  <div className="space-y-2 min-h-[120px]">
                    {stageApps.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={() => setDragging(app.id)}
                        onDragEnd={() => setDragging(null)}
                        className={`border rounded-xl p-3 shadow-sm transition-all ${
                          moving === app.id ? "opacity-40" : "hover:shadow-md"
                        }`}
                        style={{
                          background: "var(--white)",
                          borderColor: selected.has(app.id) ? "var(--blue)" : "var(--line)",
                          boxShadow: selected.has(app.id) ? "0 0 0 1px var(--blue)" : undefined,
                        }}
                      >
                        {/* Checkbox + name */}
                        <div className="flex items-start gap-1.5">
                          <input
                            type="checkbox"
                            checked={selected.has(app.id)}
                            onChange={() => toggleSelect(app.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 flex-shrink-0 rounded accent-[var(--clay)]"
                          />
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => setOpenAppId(app.id)}
                          >
                            <p className="text-sm font-medium truncate" style={{ color: "var(--ink)" }}>
                              {app.jobSeeker.user.name ?? "Applicant"}
                            </p>
                            {app.jobSeeker.headline && (
                              <p className="text-xs truncate mt-0.5" style={{ color: "var(--ink-faint)" }}>{app.jobSeeker.headline}</p>
                            )}
                          </button>
                        </div>

                        {/* Tags */}
                        {app.applicationTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {app.applicationTags.map(({ tag }) => (
                              <span
                                key={tag.id}
                                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Match chip */}
                        {app.match && (
                          <div className="relative mt-1.5">
                            <button
                              type="button"
                              onMouseEnter={() => setHoverMatchId(app.id)}
                              onMouseLeave={() => setHoverMatchId(null)}
                              className="text-xs px-1.5 py-0.5 rounded font-semibold"
                              style={
                                app.match.score >= 75
                                  ? { background: "rgba(14,158,110,.12)", color: "var(--green)" }
                                  : app.match.score >= 50
                                  ? { background: "rgba(50,122,214,.12)", color: "var(--blue)" }
                                  : { background: "var(--paper-2)", color: "var(--ink-faint)" }
                              }
                            >
                              {app.match.score}% match
                              {app.match.requiredTotal > 0 && (
                                <span className="ml-1 font-normal opacity-70">
                                  ({app.match.requiredMatched}/{app.match.requiredTotal} req)
                                </span>
                              )}
                            </button>
                            {hoverMatchId === app.id && (app.match.matchedTerms.length > 0 || app.match.missedTerms.length > 0) && (
                              <div
                                className="absolute left-0 top-full mt-1 z-50 border rounded-lg p-3 w-52 text-xs"
                                style={{ background: "var(--white)", borderColor: "var(--line)", boxShadow: "var(--shadow-lg)" }}
                              >
                                {app.match.matchedTerms.length > 0 && (
                                  <div className="mb-2">
                                    <p className="font-semibold mb-1" style={{ color: "var(--green-deep)" }}>Matched</p>
                                    <div className="flex flex-wrap gap-1">
                                      {app.match.matchedTerms.map((t) => (
                                        <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: "rgba(14,158,110,.12)", color: "var(--green)" }}>{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {app.match.missedTerms.length > 0 && (
                                  <div>
                                    <p className="font-semibold mb-1" style={{ color: "#C83C28" }}>Missing</p>
                                    <div className="flex flex-wrap gap-1">
                                      {app.match.missedTerms.map((t) => (
                                        <span key={t} className="px-1.5 py-0.5 rounded" style={{ background: "rgba(200,60,40,.08)", color: "#C83C28" }}>{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                          <InviteButton
                            jobPostingId={jobId}
                            candidateId={app.jobSeeker.user.id}
                            companyId={companyId}
                          />
                        </div>
                      </div>
                    ))}

                    {stageApps.length === 0 && (
                      <div className="border-2 border-dashed rounded-xl h-16 flex items-center justify-center" style={{ borderColor: "var(--line)" }}>
                        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>Drop here</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
