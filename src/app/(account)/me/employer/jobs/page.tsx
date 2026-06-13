import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  DRAFT: { background: "var(--paper-2)", color: "var(--ink-soft)" },
  ACTIVE: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
  CLOSED: { background: "rgba(200,60,40,.12)", color: "#C83C28" },
  EXPIRED: { background: "rgba(160,78,55,.12)", color: "var(--clay)" },
};
const DEFAULT_STATUS_STYLE = { background: "var(--paper-2)", color: "var(--ink-soft)" };

export default async function EmployerJobsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const employerProfile = await prisma.employerProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!employerProfile) redirect("/me/employer");

  const company = employerProfile.company;
  const isExpired =
    company.jobPlanKey === "MONTHLY" &&
    company.jobPlanExpiresAt != null &&
    company.jobPlanExpiresAt < new Date();
  const effectivePlanKey = isExpired ? "FREE" : company.jobPlanKey;
  const effectiveLimit = isExpired ? 3 : company.jobPostLimit;

  const [jobs, activeCount] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { companyId: employerProfile.companyId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobPosting.count({
      where: {
        companyId: employerProfile.companyId,
        status: { in: ["ACTIVE", "DRAFT"] },
      },
    }),
  ]);

  const usagePct = effectiveLimit > 0 ? (activeCount / effectiveLimit) * 100 : 100;
  const usagePillStyle =
    usagePct >= 100
      ? { background: "rgba(200,60,40,.12)", color: "#C83C28" }
      : usagePct >= 70
        ? { background: "rgba(160,78,55,.12)", color: "var(--clay)" }
        : { background: "rgba(14,158,110,.12)", color: "var(--green)" };
  const atLimit = activeCount >= effectiveLimit && company.jobPostCredits === 0;

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link href="/me" className="text-sm" style={{ color: "var(--ink-faint)" }}>
              Back
            </Link>
            <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--ink)", fontFamily: "var(--display)" }}>
              Job Postings — {company.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={usagePillStyle}>
              {activeCount} / {effectiveLimit} posts used
              {effectivePlanKey === "MONTHLY" ? " · Monthly" : " · Free"}
              {company.jobPostCredits > 0 ? ` · +${company.jobPostCredits} credits` : ""}
            </span>
            <Link
              href={`/employer/${employerProfile.companyId}/pipeline-settings`}
              className="px-3 py-2 border text-sm font-medium rounded-lg transition-colors"
              style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
            >
              Pipeline settings
            </Link>
            <Link
              href="/me/employer/jobs/new"
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ background: "var(--clay)", color: "var(--white)" }}
            >
              + Post new job
            </Link>
          </div>
        </div>

        {atLimit && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "rgba(160,78,55,.08)", borderColor: "rgba(160,78,55,.25)" }}>
            <p className="font-semibold" style={{ color: "var(--clay-deep)" }}>
              You have reached your job posting limit ({effectiveLimit} active posts on the{" "}
              {effectivePlanKey === "MONTHLY" ? "Monthly" : "Free"} plan).
            </p>
            <p className="text-sm" style={{ color: "var(--clay)" }}>
              To post more jobs, you can:
            </p>
            <ul className="text-sm list-disc list-inside space-y-1" style={{ color: "var(--clay)" }}>
              <li>
                <strong>Upgrade to Monthly Plan</strong> — 10 active posts/month. Contact us to
                arrange payment (JazzCash / EasyPaisa / bank transfer).
              </li>
              <li>
                <strong>Buy extra post credits</strong> — each credit allows one additional post
                beyond your plan limit. Contact admin to purchase.
              </li>
              <li>
                Close or delete an existing posting to free up a slot.
              </li>
            </ul>
            <p className="text-sm" style={{ color: "var(--clay)" }}>
              To upgrade, visit your{" "}
              <Link href="/me/employer" className="underline font-medium">
                employer profile
              </Link>{" "}
              and contact admin via support chat.
            </p>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--white)", borderColor: "var(--line)", color: "var(--ink-faint)" }}>
            <p>No job postings yet.</p>
            <Link
              href="/me/employer/jobs/new"
              className="hover:underline text-sm mt-2 inline-block"
              style={{ color: "var(--blue)" }}
            >
              Create your first posting
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: "var(--paper)", borderColor: "var(--line)" }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Title</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Status</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Applications</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Work type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {jobs.map((job) => (
                  <tr key={job.id} className="transition-colors hover:opacity-90">
                    <td className="px-4 py-3 font-medium max-w-xs" style={{ color: "var(--ink)" }}>
                      <span className="line-clamp-1">{job.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                        style={STATUS_COLORS[job.status] ?? DEFAULT_STATUS_STYLE}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>{job._count.applications}</td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-faint)" }}>
                      {job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/employer/${employerProfile.companyId}/jobs/${job.id}/pipeline`}
                          className="text-xs font-medium"
                          style={{ color: "var(--purple)" }}
                        >
                          Pipeline
                        </Link>
                        <Link
                          href={`/me/employer/jobs/${job.id}/analytics`}
                          className="text-xs font-medium"
                          style={{ color: "var(--green)" }}
                        >
                          Analytics
                        </Link>
                        <Link
                          href={`/me/employer/jobs/${job.id}/edit`}
                          className="text-xs font-medium"
                          style={{ color: "var(--blue)" }}
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-xs"
                          style={{ color: "var(--ink-faint)" }}
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
