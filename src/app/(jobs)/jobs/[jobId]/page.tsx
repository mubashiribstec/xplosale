import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import ApplyButton from "@/components/shared/ApplyButton";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const session = await getSession();
  const userId = session ? getUserId(session) : null;
  const isAdmin = session
    ? (session.user as unknown as { role: string }).role === "ADMIN"
    : false;

  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      company: true,
      region: true,
      _count: { select: { applications: true } },
    },
  });

  if (!job) notFound();

  const isOwner = userId === job.postedByUserId;

  if (job.status !== "ACTIVE" && !isOwner && !isAdmin) {
    notFound();
  }

  const isJobSeeker = userId
    ? !!(await prisma.jobSeekerProfile.findUnique({ where: { userId } }))
    : false;

  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency} ${job.salaryMin?.toLocaleString("en-PK") ?? "?"} – ${job.salaryMax?.toLocaleString("en-PK") ?? "?"} / month`
      : "Salary not disclosed";

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Link href="/jobs" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to jobs
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
              <Link
                href={`/companies/${job.companyId}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {job.company.name}
              </Link>
            </div>
            {job.status !== "ACTIVE" && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
                {job.status}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
              {job.region.city || job.region.name}
            </span>
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase()}
            </span>
            <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              {salary}
            </span>
          </div>

          <p className="text-sm text-gray-500">
            {job._count.applications} applicant{job._count.applications !== 1 ? "s" : ""}
          </p>

          {isJobSeeker && job.status === "ACTIVE" && (
            <div className="pt-2">
              <ApplyButton jobId={jobId} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Job Description</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {job.description}
          </pre>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-2">
          <h2 className="font-semibold text-gray-900 mb-3">About the Company</h2>
          <Link
            href={`/companies/${job.companyId}`}
            className="font-medium text-blue-600 hover:underline"
          >
            {job.company.name}
          </Link>
          {job.company.industry && (
            <p className="text-sm text-gray-500">{job.company.industry}</p>
          )}
          {job.company.size && (
            <p className="text-sm text-gray-500">{job.company.size} employees</p>
          )}
          {job.company.websiteUrl && (
            <a
              href={job.company.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {job.company.websiteUrl}
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
