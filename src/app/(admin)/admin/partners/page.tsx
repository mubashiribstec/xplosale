import { prisma } from "@/lib/prisma";
import { PartnerQueue } from "@/components/shared/PartnerQueue";
import AdminPartnersTable from "@/components/shared/AdminPartnersTable";

export default async function AdminPartnersPage() {
  const partners = await prisma.user.findMany({
    where: { OR: [{ role: "PARTNER" }, { isPartner: true }] },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isPartner: true,
      partnerType: true,
      partnerSuspendedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Partner Applications</h1>
        <PartnerQueue />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Active Partners</h2>
        <AdminPartnersTable
          partners={partners.map((p) => ({
            ...p,
            partnerSuspendedAt: p.partnerSuspendedAt?.toISOString() ?? null,
            createdAt: p.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
