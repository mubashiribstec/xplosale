import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AdminPlanEditor from "@/components/shared/shops/AdminPlanEditor";

export const metadata: Metadata = { title: "Plan Management — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { priceMonthly: "asc" } });

  const [activeSubs, totalShops, pendingShops] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE", planKey: "PREMIUM" } }),
    prisma.shop.count({ where: { status: "ACTIVE" } }),
    prisma.shop.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
        <p className="text-sm text-gray-500 mt-1">Edit limits for each subscription tier.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active Shops", value: totalShops },
          { label: "Premium Subscriptions", value: activeSubs },
          { label: "Pending Review", value: pendingShops, href: "/admin/shops" },
        ].map(({ label, value, href }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
            {href && (
              <a href={href} className="text-xs text-blue-600 mt-2 inline-block hover:underline">
                View queue →
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Plan editors */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <AdminPlanEditor
            key={plan.key}
            plan={{
              key: plan.key,
              name: plan.name,
              maxShops: plan.maxShops,
              maxProducts: plan.maxProducts,
              maxImagesPerProduct: plan.maxImagesPerProduct,
              priceMonthly: Number(plan.priceMonthly),
              featuredPlacement: plan.featuredPlacement,
              analytics: plan.analytics,
              customBanner: plan.customBanner,
            }}
          />
        ))}
      </div>
    </div>
  );
}
