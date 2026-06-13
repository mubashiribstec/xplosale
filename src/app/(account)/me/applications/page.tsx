import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, { background: string; color: string }> = {
  APPLIED: { background: "rgba(50,122,214,.12)", color: "var(--blue)" },
  REVIEWED: { background: "var(--paper-2)", color: "var(--ink-soft)" },
  SHORTLISTED: { background: "rgba(14,158,110,.12)", color: "var(--green)" },
  REJECTED: { background: "rgba(200,60,40,.12)", color: "#C83C28" },
  HIRED: { background: "rgba(144,37,179,.12)", color: "var(--purple)" },
};
const DEFAULT_STATUS_STYLE = { background: "var(--paper-2)", color: "var(--ink-soft)" };

export default async function MyApplicationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const jobSeekerProfile = await prisma.jobSeekerProfile.findUnique({ where: { userId } });
  if (!jobSeekerProfile) redirect("/me/job-seeker");

  const applications = await prisma.application.findMany({
    where: { jobSeekerId: jobSeekerProfile.id },
    include: {
      jobPosting: {
        select: {
          id: true,
          title: true,
          status: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/me" className="text-sm" style={{ color: "var(--ink-faint)" }}>
            Back
          </Link>
          <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--ink)", fontFamily: "var(--display)" }}>My Applications</h1>
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--white)", borderColor: "var(--line)", color: "var(--ink-faint)" }}>
            <p>You have not applied to any jobs yet.</p>
            <Link
              href="/jobs"
              className="hover:underline text-sm mt-2 inline-block"
              style={{ color: "var(--blue)" }}
            >
              Browse jobs
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--white)", borderColor: "var(--line)" }}>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: "var(--paper)", borderColor: "var(--line)" }}>
                <tr>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Job</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Company</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Status</th>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-faint)" }}>Applied</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {applications.map((app) => (
                  <tr key={app.id} className="transition-colors hover:opacity-90">
                    <td className="px-4 py-3 font-medium max-w-xs" style={{ color: "var(--ink)" }}>
                      <Link
                        href={`/jobs/${app.jobPosting.id}`}
                        className="transition-colors line-clamp-1 hover:underline"
                      >
                        {app.jobPosting.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-soft)" }}>
                      <Link
                        href={`/companies/${app.jobPosting.company.id}`}
                        className="transition-colors hover:underline"
                      >
                        {app.jobPosting.company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
                        style={STATUS_COLORS[app.status] ?? DEFAULT_STATUS_STYLE}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--ink-faint)" }}>
                      {new Date(app.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href="/chat"
                        className="text-xs font-medium"
                        style={{ color: "var(--blue)" }}
                      >
                        Messages
                      </Link>
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
