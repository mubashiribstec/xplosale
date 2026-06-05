import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ShopReviewQueue from "@/components/shared/shops/ShopReviewQueue";

export const metadata: Metadata = { title: "Shop Reviews — Admin" };
export const dynamic = "force-dynamic";

export default async function AdminShopsPage() {
  const shops = await prisma.shop.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      region: { select: { name: true, city: true, country: true } },
      images: { where: { kind: "STOREFRONT_BOARD" }, take: 1 },
      owner: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const serialized = shops.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    type: s.type,
    description: s.description,
    addressLine: s.addressLine,
    createdAt: s.createdAt.toISOString(),
    region: s.region,
    images: s.images,
    owner: s.owner,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shop Reviews</h1>
        <p className="text-sm text-gray-500 mt-1">
          {shops.length} shop{shops.length !== 1 ? "s" : ""} pending review
        </p>
      </div>
      <ShopReviewQueue initialShops={serialized} />
    </div>
  );
}
