import Link from "next/link";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import ConnectButton from "@/components/shared/ConnectButton";

interface SearchParams {
  page?: string;
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const limit = 20;

  const session = await getSession();
  const callerId = session ? getUserId(session) : null;

  const [people, total] = await Promise.all([
    prisma.user.findMany({
      where: {
        jobSeekerProfile: { openToWork: true },
        networkProfile: { visibility: "PUBLIC" },
      },
      select: {
        id: true,
        name: true,
        networkProfile: {
          select: {
            handle: true,
            headline: true,
            profilePhotoUrl: true,
            location: true,
          },
        },
        jobSeekerProfile: {
          select: {
            headline: true,
            expectedSalaryMin: true,
            expectedSalaryMax: true,
            currency: true,
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({
      where: {
        jobSeekerProfile: { openToWork: true },
        networkProfile: { visibility: "PUBLIC" },
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  const connectionStatusMap: Record<string, { status: "none" | "pending" | "accepted" | "incoming"; connectionId?: string }> = {};
  if (callerId) {
    const peopleIds = people.map((p) => p.id);
    const conns = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: callerId, recipientId: { in: peopleIds } },
          { recipientId: callerId, requesterId: { in: peopleIds } },
        ],
      },
    });
    for (const c of conns) {
      const otherId = c.requesterId === callerId ? c.recipientId : c.requesterId;
      if (c.status === "ACCEPTED") {
        connectionStatusMap[otherId] = { status: "accepted", connectionId: c.id };
      } else if (c.status === "PENDING") {
        connectionStatusMap[otherId] = {
          status: c.requesterId === callerId ? "pending" : "incoming",
          connectionId: c.id,
        };
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Discover Professionals</h1>
          <p className="text-gray-500 mt-1">{total} open-to-work professional{total !== 1 ? "s" : ""}</p>
        </div>

        {people.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
            No professionals found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map((person) => {
              const np = person.networkProfile;
              if (!np) return null;
              const photoUrl = np.profilePhotoUrl ? getPublicUrl(np.profilePhotoUrl) : null;
              const connState = connectionStatusMap[person.id] ?? { status: "none" as const };

              return (
                <div
                  key={person.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-3">
                    <Link href={`/n/${np.handle}`} className="shrink-0">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={person.name ?? np.handle}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-lg">
                          {(person.name ?? np.handle)[0].toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/n/${np.handle}`}
                        className="font-semibold text-gray-900 text-sm hover:underline block truncate"
                      >
                        {person.name ?? np.handle}
                      </Link>
                      {np.headline && (
                        <p className="text-xs text-gray-500 truncate">{np.headline}</p>
                      )}
                      {np.location && (
                        <p className="text-xs text-gray-400 truncate">{np.location}</p>
                      )}
                    </div>
                  </div>

                  {person.jobSeekerProfile && (
                    <div className="text-xs text-gray-500">
                      {person.jobSeekerProfile.expectedSalaryMin && (
                        <span>
                          {person.jobSeekerProfile.currency ?? "PKR"}{" "}
                          {person.jobSeekerProfile.expectedSalaryMin.toLocaleString()}
                          {person.jobSeekerProfile.expectedSalaryMax
                            ? ` – ${person.jobSeekerProfile.expectedSalaryMax.toLocaleString()}`
                            : "+"}
                        </span>
                      )}
                    </div>
                  )}

                  <ConnectButton
                    targetUserId={person.id}
                    currentUserId={callerId}
                    initialStatus={connState.status}
                    connectionId={connState.connectionId}
                  />
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            {page > 1 && (
              <Link
                href={`/n/people?page=${page - 1}`}
                className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Page {page} of {pages}
            </span>
            {page < pages && (
              <Link
                href={`/n/people?page=${page + 1}`}
                className="px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
