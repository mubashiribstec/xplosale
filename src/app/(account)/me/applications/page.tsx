import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-50 text-blue-600",
  REVIEWED: "bg-gray-100 text-gray-600",
  SHORTLISTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  HIRED: "bg-purple-100 text-purple-700",
};

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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <Link href="/me" className="text-sm text-gray-400 hover:text-gray-600">
            Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">My Applications</h1>
        </div>

        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
            <p>You have not applied to any jobs yet.</p>
            <Link
              href="/jobs"
              className="text-blue-600 hover:underline text-sm mt-2 inline-block"
            >
              Browse jobs
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Job</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Applied</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs">
                      <Link
                        href={`/jobs/${app.jobPosting.id}`}
                        className="hover:text-blue-600 transition-colors line-clamp-1"
                      >
                        {app.jobPosting.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <Link
                        href={`/companies/${app.jobPosting.company.id}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {app.jobPosting.company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(app.createdAt).toLocaleDateString("en-PK")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href="/chat"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
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
