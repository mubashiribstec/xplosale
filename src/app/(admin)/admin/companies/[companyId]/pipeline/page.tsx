import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminCompanyPipelinePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      pipelineStages: { orderBy: { order: "asc" } },
      owner: { select: { id: true, name: true, email: true } },
    },
  });

  if (!company) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin"
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Admin dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Pipeline Configuration
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {company.name} — owned by {company.owner.name ?? company.owner.email ?? company.owner.id}
        </p>
        <div className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-0.5">
          Read-only admin view
        </div>
      </div>

      {company.pipelineStages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No pipeline stages configured yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Color</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Flags</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {company.pipelineStages.map(async (stage) => {
                const count = await prisma.application.count({
                  where: { currentStageId: stage.id },
                });
                return (
                  <tr key={stage.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{stage.order}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{stage.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-4 h-4 rounded"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-gray-400 font-mono text-xs">{stage.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {stage.isInitial && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Initial</span>
                        )}
                        {stage.isHired && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Hired</span>
                        )}
                        {stage.isRejected && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Rejected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
