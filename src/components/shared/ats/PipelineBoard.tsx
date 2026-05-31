"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type Stage = {
  id: string;
  name: string;
  color: string;
  isInitial: boolean;
  isHired: boolean;
  isRejected: boolean;
  order: number;
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
};

type PipelineBoardProps = {
  jobId: string;
  jobTitle: string;
  stages: Stage[];
  applications: Application[];
  fallbackStageMap: Record<string, string>; // applicationId → stageId (backfilled)
};

export default function PipelineBoard({
  jobId,
  jobTitle,
  stages,
  applications: initial,
  fallbackStageMap,
}: PipelineBoardProps) {
  const [apps, setApps] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getStageId = useCallback(
    (app: Application) => app.currentStageId ?? fallbackStageMap[app.id] ?? stages[0]?.id,
    [fallbackStageMap, stages]
  );

  async function handleDrop(stageId: string) {
    if (!dragging || dragging === stageId) return;
    const appId = dragging;
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

  const appsByStage = stages.reduce<Record<string, Application[]>>((acc, s) => {
    acc[s.id] = apps.filter((a) => getStageId(a) === s.id);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{jobTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{apps.length} total applicants</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/employer/${jobId.split("-")[0]}/pipeline-settings`}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded px-2 py-1"
          >
            Pipeline settings
          </Link>
          <Link
            href={`/me/employer/jobs/${jobId}/edit`}
            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1"
          >
            Edit job
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4" style={{ minWidth: `${stages.length * 220}px` }}>
          {stages.map((stage) => {
            const stageApps = appsByStage[stage.id] ?? [];
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-52"
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => handleDrop(stage.id)}
              >
                {/* Column header */}
                <div
                  className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg"
                  style={{ backgroundColor: `${stage.color}18` }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-semibold text-gray-700 truncate">{stage.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{stageApps.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[120px]">
                  {stageApps.map((app) => (
                    <div
                      key={app.id}
                      draggable
                      onDragStart={() => setDragging(app.id)}
                      onDragEnd={() => setDragging(null)}
                      className={`bg-white border border-gray-200 rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm transition-opacity ${
                        moving === app.id ? "opacity-40" : "hover:shadow-md"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {app.jobSeeker.user.name ?? "Applicant"}
                      </p>
                      {app.jobSeeker.headline && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{app.jobSeeker.headline}</p>
                      )}
                      {app.coverLetter && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{app.coverLetter}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-2">
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
  );
}
