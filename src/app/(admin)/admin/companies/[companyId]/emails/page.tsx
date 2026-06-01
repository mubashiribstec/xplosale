import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminEmailLogPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userRole = (session.user as { role: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const logs = await prisma.emailSendLog.findMany({
    where: {
      application: { jobPosting: { companyId } },
      sentAt: { gte: since },
    },
    include: {
      application: {
        select: {
          id: true,
          jobPosting: { select: { id: true, title: true } },
          jobSeeker: { select: { user: { select: { name: true } } } },
        },
      },
      template: { select: { name: true, kind: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 500,
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/admin/companies/${companyId}/pipeline`}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              ← Company overview
            </Link>
            <h1 className="mt-2 text-xl font-bold text-gray-900">Email log</h1>
            <p className="text-sm text-gray-500 mt-0.5">{company.name} — last 90 days</p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-sm text-gray-400">
            No emails sent in the last 90 days.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Sent at</th>
                  <th className="text-left px-4 py-3 font-medium">To</th>
                  <th className="text-left px-4 py-3 font-medium">Candidate</th>
                  <th className="text-left px-4 py-3 font-medium">Job</th>
                  <th className="text-left px-4 py-3 font-medium">Template</th>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{log.toEmail}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.application?.jobSeeker.user.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">
                      {log.application?.jobPosting.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {log.template?.name ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{log.subject}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          log.status === "SENT"
                            ? "bg-green-100 text-green-700"
                            : log.status === "MOCKED"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.provider}</td>
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
