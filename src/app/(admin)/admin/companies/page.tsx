import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { jobPostings: true, pipelineStages: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Companies</h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Company</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Jobs</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Stages</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div>
                    {company.name}
                    {company.verifiedEmployer && (
                      <span className="ml-1 text-xs bg-green-100 text-green-700 px-1 rounded">✓ Verified</span>
                    )}
                  </div>
                  {company.industry && (
                    <div className="text-xs text-gray-400 mt-0.5">{company.industry}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {company.owner.name ?? company.owner.email ?? company.owner.id}
                </td>
                <td className="px-4 py-3 text-gray-600">{company._count.jobPostings}</td>
                <td className="px-4 py-3 text-gray-600">{company._count.pipelineStages}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/companies/${company.id}/pipeline`}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    View pipeline
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
