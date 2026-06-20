import { prisma } from "@/lib/prisma";
import { ShopApplicationQueue } from "@/components/shared/ShopApplicationQueue";
import AdminShopkeepersTable from "@/components/shared/AdminShopkeepersTable";

export default async function AdminShopApplicationsPage() {
  const shopkeepers = await prisma.user.findMany({
    where: { canCreateShop: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Shop Applications</h1>
        <ShopApplicationQueue />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Active Shopkeepers</h2>
        <AdminShopkeepersTable
          shopkeepers={shopkeepers.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
