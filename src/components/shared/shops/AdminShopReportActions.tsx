"use client";

interface AdminShopReportActionsProps {
  reportId: string;
  shopName: string;
  shopSlug: string;
  shopSuspended: boolean;
  status: string;
}

export default function AdminShopReportActions({
  reportId, shopName, shopSlug, shopSuspended, status,
}: AdminShopReportActionsProps) {
  async function doAction(action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    const body: Record<string, string> = { action };
    if (action === "CLOSE_ACTION") body.reason = "Suspended via shop report";
    const res = await fetch(`/api/admin/shops/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex gap-2 flex-wrap flex-shrink-0">
      {status === "OPEN" && (
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg border border-amber-200 hover:bg-amber-100 cursor-pointer"
          onClick={() => void doAction("INVESTIGATING")}
        >
          Investigate
        </button>
      )}
      {["OPEN", "INVESTIGATING"].includes(status) && (
        <>
          {!shopSuspended && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 cursor-pointer"
              onClick={() => void doAction("CLOSE_ACTION", `Suspend "${shopName}" and close this report?`)}
            >
              Suspend Shop
            </button>
          )}
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer"
            onClick={() => void doAction("CLOSE_NO_ACTION")}
          >
            Close — No Action
          </button>
        </>
      )}
      <a
        href={`/shops/${shopSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100"
      >
        View Shop ↗
      </a>
    </div>
  );
}
