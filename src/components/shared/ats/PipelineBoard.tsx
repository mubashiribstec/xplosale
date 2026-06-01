"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import CandidateDrawer from "./CandidateDrawer";

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

  const filteredApps = filterTagId
    ? apps.filter((a) => a.applicationTags.some((t) => t.tag.id === filterTagId))
    : apps;

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
            <h1 className="text-xl font-bold text-gray-900">{jobTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{apps.length} total applicants</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/employer/${companyId}/jobs/${jobId}/team`}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1"
            >
              Manage team
            </Link>
            <Link
              href={`/employer/${companyId}/pipeline-settings`}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1"
            >
              Pipeline settings
            </Link>
            <Link
              href={`/employer/${companyId}/templates`}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1"
            >
              Email templates
            </Link>
          </div>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400">Filter by tag:</span>
            <button
              type="button"
              onClick={() => setFilterTagId(null)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                !filterTagId ? "bg-gray-800 text-white border-gray-800" : "border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
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
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
            <select
              value={bulkAction}
              onChange={async (e) => {
                setBulkAction(e.target.value);
                if (e.target.value === "SEND_EMAIL" || e.target.value === "REJECT_WITH_TEMPLATE") {
                  await fetchBulkTemplates();
                }
              }}
              className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none"
            >
              <option value="">Choose action…</option>
              <option value="MOVE_STAGE">Move to stage</option>
              <option value="ADD_TAG">Add tag</option>
              <option value="SEND_EMAIL">Send email</option>
              <option value="REJECT_WITH_TEMPLATE">Reject with email</option>
            </select>

            {bulkAction === "MOVE_STAGE" && (
              <select value={bulkStageId} onChange={(e) => setBulkStageId(e.target.value)}
                className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                <option value="">Select stage…</option>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            {bulkAction === "ADD_TAG" && (
              <select value={bulkTagId} onChange={(e) => setBulkTagId(e.target.value)}
                className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                <option value="">Select tag…</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            {(bulkAction === "SEND_EMAIL" || bulkAction === "REJECT_WITH_TEMPLATE") && (
              <select value={bulkTemplateId} onChange={(e) => setBulkTemplateId(e.target.value)}
                className="text-sm border border-blue-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                <option value="">Select template…</option>
                {bulkTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            {bulkMsg && <span className={`text-xs ${bulkMsg.startsWith("Done") ? "text-green-700" : "text-red-600"}`}>{bulkMsg}</span>}

            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => { setSelected(new Set()); setBulkAction(""); setBulkMsg(null); }}
                className="text-sm text-gray-500 hover:text-gray-700">
                Clear
              </button>
              <button type="button" onClick={() => void executeBulk()} disabled={bulking}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
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
                    <span className="text-xs font-semibold text-gray-700 truncate">{stage.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{stageApps.length}</span>
                  </div>

                  <div className="space-y-2 min-h-[120px]">
                    {stageApps.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={() => setDragging(app.id)}
                        onDragEnd={() => setDragging(null)}
                        className={`bg-white border rounded-xl p-3 shadow-sm transition-all ${
                          moving === app.id ? "opacity-40" : "hover:shadow-md"
                        } ${selected.has(app.id) ? "border-blue-400 ring-1 ring-blue-300" : "border-gray-200"}`}
                      >
                        {/* Checkbox + name */}
                        <div className="flex items-start gap-1.5">
                          <input
                            type="checkbox"
                            checked={selected.has(app.id)}
                            onChange={() => toggleSelect(app.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 flex-shrink-0 rounded accent-blue-600"
                          />
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => setOpenAppId(app.id)}
                          >
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {app.jobSeeker.user.name ?? "Applicant"}
                            </p>
                            {app.jobSeeker.headline && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{app.jobSeeker.headline}</p>
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

                        <p className="text-xs text-gray-300 mt-1.5">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}

                    {stageApps.length === 0 && (
                      <div className="border-2 border-dashed border-gray-100 rounded-xl h-16 flex items-center justify-center">
                        <span className="text-xs text-gray-300">Drop here</span>
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
