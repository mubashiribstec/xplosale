import { prisma } from "@/lib/prisma";
import AdminEscrowResolve from "@/components/shared/AdminEscrowResolve";

export default async function AdminEscrowPage() {
  const disputes = await prisma.escrowTransaction.findMany({
    where: { status: "DISPUTED" },
    include: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Disputed Escrows</h1>
      <p className="text-sm text-gray-500 mb-6">{disputes.length} dispute{disputes.length !== 1 ? "s" : ""} awaiting resolution</p>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          No disputed escrows at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d) => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{d.listing.title}</p>
                  <p className="text-sm text-gray-500">
                    Buyer: <span className="font-medium text-gray-700">{d.buyer.name ?? "—"}</span>
                    {" · "}
                    Seller: <span className="font-medium text-gray-700">{d.seller.name ?? "—"}</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Amount: <span className="font-medium text-gray-700">{d.currency} {Number(d.amount).toLocaleString("en-PK")}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Created {new Date(d.createdAt).toLocaleDateString("en-PK")}
                  </p>
                </div>
                <AdminEscrowResolve escrowId={d.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
