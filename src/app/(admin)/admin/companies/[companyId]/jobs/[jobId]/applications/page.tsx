import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminJobApplicationsPage({
  params,
}: {
  params: Promise<{ companyId: string; jobId: string }>;
}) {
  const session = await getSession();
  if (!session || (session.user as { role: string }).role !== "ADMIN") redirect("/login");

  const { companyId, jobId } = await params;

  const [job, applications] = await Promise.all([
    prisma.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        companyId: true,
        requiredSkills: true,
        niceToHaveSkills: true,
        requiredKeywords: true,
        company: { select: { name: true } },
      },
    }),
    prisma.application.findMany({
      where: { jobPostingId: jobId },
      include: {
        jobSeeker: {
          select: {
            headline: true,
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        currentStage: { select: { name: true, color: true } },
        applicationTags: { include: { tag: { select: { name: true, color: true } } } },
        candidateMatch: {
          select: {
            score: true,
            requiredMatched: true,
            requiredTotal: true,
            niceToHaveMatched: true,
            niceToHaveTotal: true,
            keywordMatched: true,
            keywordTotal: true,
            matchedTerms: true,
            missedTerms: true,
            computedAt: true,
          },
        },
      },
    }),
  ]);

  if (!job || job.companyId !== companyId) notFound();

  // Sort by match score desc, unscored last
  const sorted = [...applications].sort(
    (a, b) => (b.candidateMatch?.score ?? -1) - (a.candidateMatch?.score ?? -1)
  );

  const requiredSkills = job.requiredSkills as string[];
  const niceToHaveSkills = job.niceToHaveSkills as string[];
  const requiredKeywords = job.requiredKeywords as string[];
  const hasSkills = requiredSkills.length > 0 || niceToHaveSkills.length > 0 || requiredKeywords.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/companies/${companyId}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Back to company
        </Link>
        <h1 className="text-xl font-bold mt-2">{job.company.name} — {job.title}</h1>
        <p className="text-sm text-gray-500">{sorted.length} applications · Read-only admin view</p>
      </div>

      {/* Skills config */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700">Job matching criteria</p>
        {!hasSkills && (
          <p className="text-sm text-amber-600">No required skills configured — match scores unavailable.</p>
        )}
        {requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-gray-500 w-32">Required skills:</span>
            {requiredSkills.map((s) => (
              <span key={s} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
        {niceToHaveSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-gray-500 w-32">Nice-to-have:</span>
            {niceToHaveSkills.map((s) => (
              <span key={s} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
        {requiredKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-gray-500 w-32">Keywords:</span>
            {requiredKeywords.map((s) => (
              <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Ranked table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Match</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Matched</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Missed</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((app, idx) => {
              const m = app.candidateMatch;
              return (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {app.jobSeeker.user.name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {app.jobSeeker.user.phone ?? app.jobSeeker.user.email ?? ""}
                    </p>
                    {app.jobSeeker.headline && (
                      <p className="text-xs text-gray-400 truncate max-w-xs">{app.jobSeeker.headline}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {app.currentStage ? (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${app.currentStage.color}22`, color: app.currentStage.color }}
                      >
                        {app.currentStage.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m ? (
                      <span
                        className={`text-sm font-bold ${
                          m.score >= 75 ? "text-green-600" : m.score >= 50 ? "text-blue-600" : "text-gray-400"
                        }`}
                      >
                        {m.score}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">No data</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {(m?.matchedTerms as string[] | undefined)?.map((t) => (
                        <span key={t} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {(m?.missedTerms as string[] | undefined)?.map((t) => (
                        <span key={t} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {app.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                  No applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
