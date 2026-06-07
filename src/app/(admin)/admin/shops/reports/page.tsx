import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminShopReportActions from "@/components/shared/shops/AdminShopReportActions";

export const metadata: Metadata = { title: "Shop Reports — Admin" };
export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  OPEN: "#dc2626",
  INVESTIGATING: "#d97706",
  CLOSED_ACTION: "#16a34a",
  CLOSED_NO_ACTION: "#9ca3af",
};

const REASON_LABEL: Record<string, string> = {
  FRAUD: "Fraud / Scam",
  FAKE_PRODUCTS: "Fake Products",
  MISLEADING: "Misleading Info",
  INAPPROPRIATE: "Inappropriate",
  SPAM: "Spam",
  OTHER: "Other",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminShopReportsPage({ searchParams }: PageProps) {
  const { status: statusFilter } = await searchParams;

  const reports = await prisma.shopReport.findMany({
    where: statusFilter
      ? { status: statusFilter as "OPEN" }
      : { status: { in: ["OPEN", "INVESTIGATING"] } },
    include: {
      shop: { select: { id: true, name: true, slug: true, status: true } },
      reporter: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.shopReport.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-PK", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  const tabDefs = [
    { key: "", label: "Active (Open + Investigating)" },
    { key: "OPEN", label: `Open (${countMap["OPEN"] ?? 0})` },
    { key: "INVESTIGATING", label: `Investigating (${countMap["INVESTIGATING"] ?? 0})` },
    { key: "CLOSED_ACTION", label: `Closed — Action (${countMap["CLOSED_ACTION"] ?? 0})` },
    { key: "CLOSED_NO_ACTION", label: `Closed — No Action (${countMap["CLOSED_NO_ACTION"] ?? 0})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shop Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Review and act on user-submitted shop reports</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-3 flex-wrap">
        {tabDefs.map((tab) => {
          const active = (!statusFilter && !tab.key) || statusFilter === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key ? `/admin/shops/reports?status=${tab.key}` : "/admin/shops/reports"}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          No reports found
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: `${STATUS_COLOR[report.status]}22`, color: STATUS_COLOR[report.status] }}
                    >
                      {report.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {report.shop.name}
                    </span>
                    {report.shop.status === "SUSPENDED" && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                        SUSPENDED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    <strong>{REASON_LABEL[report.reason] ?? report.reason}</strong>
                    {" · "} Reported by {report.reporter.name ?? report.reporter.email}
                    {" · "}{formatDate(report.createdAt)}
                  </p>
                  {report.details && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                      {report.details}
                    </p>
                  )}
                </div>

                <AdminShopReportActions
                  reportId={report.id}
                  shopName={report.shop.name}
                  shopSlug={report.shop.slug}
                  shopSuspended={report.shop.status === "SUSPENDED"}
                  status={report.status}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
