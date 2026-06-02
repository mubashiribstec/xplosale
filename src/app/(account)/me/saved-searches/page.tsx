"use server";

import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import SavedSearchesClient from "./SavedSearchesClient";

export default async function SavedSearchesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const raw = await prisma.savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const searches = raw.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), lastSentAt: s.lastSentAt?.toISOString() ?? null }));

  const grouped = searches.reduce<Record<string, typeof searches>>(
    (acc, s) => {
      if (!acc[s.vertical]) acc[s.vertical] = [];
      acc[s.vertical].push(s);
      return acc;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>

        {searches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-lg">No saved searches yet.</p>
            <p className="text-sm mt-1">Save a search from the jobs or marketplace pages to get alerts.</p>
          </div>
        ) : (
          <SavedSearchesClient grouped={grouped} />
        )}
      </div>
    </main>
  );
}
