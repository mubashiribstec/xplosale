import { prisma } from "@/lib/prisma";
import AdminUsersTable from "@/components/shared/AdminUsersTable";

interface PageProps {
  searchParams: Promise<{ search?: string; role?: string; status?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const { search = "", role = "", status = "", page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const limit = 30;

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : {}),
    ...(role ? { role: role as "USER" | "PARTNER" | "ADMIN" } : {}),
    ...(status
      ? { verificationStatus: status as "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        verificationStatus: true,
        canCreateShop: true,
        bannedAt: true,
        createdAt: true,
        sellerProfile: { select: { id: true } },
        networkProfile: { select: { handle: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
      <AdminUsersTable
        users={users.map((u) => ({ ...u, bannedAt: u.bannedAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString() }))}
        total={total}
        page={page}
        pages={pages}
      />
    </div>
  );
}
