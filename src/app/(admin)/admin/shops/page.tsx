import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import ShopReviewQueue from "@/components/shared/shops/ShopReviewQueue";
import AdminShopsTable from "@/components/shared/shops/AdminShopsTable";
import AdminCommissionTable from "@/components/shared/shops/AdminCommissionTable";

export const metadata: Metadata = { title: "Shops — Admin" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

interface PageProps {
  searchParams: Promise<{ tab?: string; status?: string; search?: string; page?: string }>;
}

export default async function AdminShopsPage({ searchParams }: PageProps) {
  const { tab = "pending", status = "", search = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);

  if (tab === "pending") {
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
        <Tabs tab={tab} />
        <div className="mb-6 mt-4">
          <p className="text-sm text-gray-500">
            {shops.length} shop{shops.length !== 1 ? "s" : ""} pending review
          </p>
        </div>
        <ShopReviewQueue initialShops={serialized} />
      </div>
    );
  }

  if (tab === "commission") {
    const defaultRate = env.DEFAULT_COMMISSION_RATE_PCT;
    const [commissionShops, balances] = await Promise.all([
      prisma.shop.findMany({
        where: { billingMode: "COMMISSION" },
        select: { id: true, name: true, commissionRate: true, owner: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.commissionLedgerEntry.groupBy({
        by: ["shopId"],
        _sum: { amount: true },
      }),
    ]);

    const balanceByShop = new Map(balances.map((b) => [b.shopId, Number(b._sum.amount ?? 0)]));

    const serialized = commissionShops.map((s) => ({
      id: s.id,
      name: s.name,
      customRate: s.commissionRate != null ? Number(s.commissionRate) : null,
      rate: s.commissionRate != null ? Number(s.commissionRate) : defaultRate,
      balance: balanceByShop.get(s.id) ?? 0,
      owner: s.owner,
    }));

    return (
      <div>
        <Tabs tab={tab} />
        <div className="mt-4">
          <AdminCommissionTable shops={serialized} defaultRate={defaultRate} />
        </div>
      </div>
    );
  }

  // tab === "all"
  const where = {
    ...(status ? { status: status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SUSPENDED" } : {}),
    ...(search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {}),
  };

  const [total, shops] = await Promise.all([
    prisma.shop.count({ where }),
    prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { orders: true, products: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div>
      <Tabs tab={tab} />
      <div className="mt-4">
        <AdminShopsTable
          shops={shops.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))}
          total={total}
          page={page}
          pages={pages}
        />
      </div>
    </div>
  );
}

function Tabs({ tab }: { tab: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Shops</h1>
      <div className="flex gap-2">
        <Link
          href="/admin/shops?tab=pending"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            tab === "pending" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          Pending Review
        </Link>
        <Link
          href="/admin/shops?tab=all"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            tab === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          All Shops
        </Link>
        <Link
          href="/admin/shops?tab=commission"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            tab === "commission" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          Commission
        </Link>
      </div>
    </div>
  );
}
