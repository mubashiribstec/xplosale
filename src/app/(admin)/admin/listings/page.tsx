import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AdminListingsQueue from "@/components/shared/AdminListingsQueue";
import AdminListingsTable from "@/components/shared/AdminListingsTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{ tab?: string; status?: string; search?: string; page?: string }>;
}

export default async function AdminListingsPage({ searchParams }: Props) {
  const { tab = "pending", status = "", search = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10) || 1);

  if (tab === "pending") {
    const listings = await prisma.listing.findMany({
      where: { status: "PENDING_REVIEW" },
      include: {
        region: { select: { id: true, name: true, city: true } },
        sellerProfile: {
          select: {
            id: true,
            agentTier: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div>
            <Tabs tab={tab} />
            <p className="text-sm text-gray-500 mt-1">{listings.length} pending</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <AdminListingsQueue
              listings={listings.map((l) => ({
                ...l,
                price: l.price.toString(),
                createdAt: l.createdAt.toISOString(),
              }))}
            />
          </div>
        </div>
      </main>
    );
  }

  // tab === "all"
  const where = {
    ...(status ? { status: status as "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "EXPIRED" | "SOLD" } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [total, listings] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        price: true,
        currency: true,
        status: true,
        createdAt: true,
        sellerProfile: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const pages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Tabs tab={tab} />
        <AdminListingsTable
          listings={listings.map((l) => ({ ...l, price: l.price.toString(), createdAt: l.createdAt.toISOString() }))}
          total={total}
          page={page}
          pages={pages}
        />
      </div>
    </main>
  );
}

function Tabs({ tab }: { tab: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Listings</h1>
      <div className="flex gap-2">
        <Link
          href="/admin/listings?tab=pending"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            tab === "pending" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          Pending Review
        </Link>
        <Link
          href="/admin/listings?tab=all"
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
            tab === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          All Listings
        </Link>
      </div>
    </div>
  );
}
