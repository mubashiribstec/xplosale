"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ShopkeeperUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface AdminShopkeepersTableProps {
  shopkeepers: ShopkeeperUser[];
}

export default function AdminShopkeepersTable({ shopkeepers }: AdminShopkeepersTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function revoke(userId: string) {
    setLoadingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canCreateShop: false }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) router.refresh();
      else setError(json.error ?? "Failed");
    } catch {
      setError("Network error");
    } finally {
      setLoadingId(null);
    }
  }

  if (shopkeepers.length === 0) {
    return <p className="text-gray-500 text-sm py-8 text-center">No active shopkeepers.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">Contact</th>
              <th className="pb-2 pr-4 font-medium">Since</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shopkeepers.map((u) => (
              <tr key={u.id}>
                <td className="py-3 pr-4 font-medium text-gray-900">{u.name ?? "—"}</td>
                <td className="py-3 pr-4 text-gray-600">{u.email ?? u.phone ?? "—"}</td>
                <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString("en-PK")}
                </td>
                <td className="py-3">
                  <button
                    type="button"
                    onClick={() => void revoke(u.id)}
                    disabled={loadingId === u.id}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    {loadingId === u.id ? "…" : "Revoke"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
