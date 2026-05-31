import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  CLOSED: "bg-red-100 text-red-600",
  EXPIRED: "bg-orange-100 text-orange-600",
};

export default async function EmployerJobsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const employerProfile = await prisma.employerProfile.findUnique({
    where: { userId },
    include: { company: true },
  });

  if (!employerProfile) redirect("/me/employer");

  const jobs = await prisma.jobPosting.findMany({
    where: { companyId: employerProfile.companyId },
    include: {
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/me" className="text-sm text-gray-400 hover:text-gray-600">
              Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Job Postings — {employerProfile.company.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/employer/${employerProfile.companyId}/pipeline-settings`}
              className="px-3 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:border-gray-300 transition-colors"
            >
              Pipeline settings
            </Link>
            <Link
              href="/me/employer/jobs/new"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Post new job
            </Link>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p>No job postings yet.</p>
            <Link
              href="/me/employer/jobs/new"
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Create your first posting
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Applications</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Work type</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                      <span className="line-clamp-1">{job.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job._count.applications}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <Link
                          href={`/employer/${employerProfile.companyId}/jobs/${job.id}/pipeline`}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Pipeline
                        </Link>
                        <Link
                          href={`/me/employer/jobs/${job.id}/edit`}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-xs text-gray-500 hover:text-gray-700"
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
