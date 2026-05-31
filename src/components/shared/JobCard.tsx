import Link from "next/link";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    remoteType: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    currency: string;
    createdAt: string | Date;
    company: { id: string; name: string; industry?: string | null; verifiedEmployer: boolean };
    region: { name: string; city: string };
    _count: { applications: number };
  };
}

function daysAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export default function JobCard({ job }: JobCardProps) {
  const salary =
    job.salaryMin || job.salaryMax
      ? `${job.currency} ${job.salaryMin?.toLocaleString("en-PK") ?? "?"} – ${job.salaryMax?.toLocaleString("en-PK") ?? "?"}`
      : "Salary not disclosed";

  return (
    <Link href={`/jobs/${job.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            {job.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span>{job.company.name}</span>
            {job.company.verifiedEmployer && <VerifiedBadge />}
          </div>
          {job.company.industry && (
            <p className="text-xs text-gray-400">{job.company.industry}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            {job.region.city || job.region.name}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase()}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{salary}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
          <span>{job._count.applications} applicant{job._count.applications !== 1 ? "s" : ""}</span>
          <span>{daysAgo(job.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
