import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";

interface Props {
  params: Promise<{ companyId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companyId } = await params;
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, industry: true, region: { select: { city: true } } },
  });
  if (!company) return { title: "Company | Xplosale Jobs" };

  const description = [
    company.industry,
    company.region.city,
    "— hiring on Xplosale",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: `${company.name} | Xplosale Jobs`,
    description,
    openGraph: {
      title: `${company.name} | Xplosale Jobs`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${company.name} | Xplosale Jobs`,
      description,
    },
  };
}

export default async function CompanyPage({ params }: Props) {
  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      region: true,
      jobPostings: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!company) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Link href="/jobs" className="text-sm text-gray-400 hover:text-gray-600">
          ← Back to jobs
        </Link>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-start gap-4">
            {company.logoUrl && (
              <Image
                src={company.logoUrl}
                alt={company.name}
                width={64}
                height={64}
                className="rounded-xl object-contain border border-gray-200"
                unoptimized
              />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                {company.verifiedEmployer && <VerifiedBadge size="md" />}
              </div>
              {company.industry && (
                <p className="text-sm text-gray-500">{company.industry}</p>
              )}
              {company.size && (
                <p className="text-sm text-gray-500">{company.size} employees</p>
              )}
              <p className="text-sm text-gray-400">{company.region.city || company.region.name}</p>
            </div>
          </div>

          {company.websiteUrl && (
            <a
              href={company.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-blue-600 hover:underline"
            >
              {company.websiteUrl}
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Active Job Openings</h2>
          {company.jobPostings.length === 0 ? (
            <p className="text-sm text-gray-400">No active openings at this time.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {company.jobPostings.map((job) => (
                <li key={job.id} className="py-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-blue-600 hover:underline font-medium text-sm"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {job.remoteType.charAt(0) + job.remoteType.slice(1).toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
