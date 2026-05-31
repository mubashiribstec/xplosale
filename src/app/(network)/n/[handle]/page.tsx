import { notFound } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { getPublicUrl } from "@/core/adapters/storage";
import ConnectButton from "@/components/shared/ConnectButton";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { getUserTier } from "@/lib/tier";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  const profile = await prisma.networkProfile.findUnique({
    where: { handle },
    include: {
      user: { select: { id: true, name: true, verificationStatus: true, isPartner: true } },
      experiences: { orderBy: { start: "desc" } },
      educations: { orderBy: { start: "desc" } },
      profileSkills: {
        include: { skill: { select: { id: true, name: true } } },
      },
      endorsementsReceived: {
        take: 20,
        include: {
          skill: { select: { id: true, name: true } },
          giverProfile: { select: { handle: true, user: { select: { name: true } } } },
        },
      },
      posts: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { likes: true, comments: true } } },
      },
    },
  });

  if (!profile) notFound();

  const session = await getSession();
  const callerId = session ? getUserId(session) : null;

  let isConnected = false;
  let connectionStatus: "none" | "pending" | "accepted" | "incoming" = "none";
  let connectionId: string | undefined;

  if (callerId && callerId !== profile.userId) {
    const conn = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: callerId, recipientId: profile.userId },
          { requesterId: profile.userId, recipientId: callerId },
        ],
      },
    });
    if (conn) {
      connectionId = conn.id;
      if (conn.status === "ACCEPTED") {
        isConnected = true;
        connectionStatus = "accepted";
      } else if (conn.status === "PENDING") {
        connectionStatus = conn.requesterId === callerId ? "pending" : "incoming";
      }
    }
  } else if (callerId === profile.userId) {
    isConnected = true;
  }

  if (profile.visibility === "CONNECTIONS" && !isConnected && callerId !== profile.userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center text-2xl text-gray-400">
            {(profile.user.name ?? profile.handle)[0].toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{profile.user.name}</h1>
          {profile.headline && <p className="text-gray-500 mt-1">{profile.headline}</p>}
          <p className="text-sm text-gray-400 mt-4 mb-6">
            This profile is only visible to connections.
          </p>
          {callerId && (
            <ConnectButton
              targetUserId={profile.userId}
              currentUserId={callerId}
              initialStatus={connectionStatus}
              connectionId={connectionId}
            />
          )}
        </div>
      </main>
    );
  }

  const connectionCount = await prisma.connection.count({
    where: {
      OR: [{ requesterId: profile.userId }, { recipientId: profile.userId }],
      status: "ACCEPTED",
    },
  });

  const photoUrl = profile.profilePhotoUrl ? getPublicUrl(profile.profilePhotoUrl) : null;
  const bannerUrl = profile.bannerUrl ? getPublicUrl(profile.bannerUrl) : null;

  const endorsementsBySkill: Record<string, { skillName: string; count: number }> = {};
  for (const e of profile.endorsementsReceived) {
    const key = e.skillId;
    if (!endorsementsBySkill[key]) {
      endorsementsBySkill[key] = { skillName: e.skill.name, count: 0 };
    }
    endorsementsBySkill[key].count++;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {bannerUrl && (
            <div className="h-40 w-full overflow-hidden">
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            </div>
          )}
          {!bannerUrl && <div className="h-24 bg-gradient-to-r from-blue-500 to-blue-700" />}

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={profile.user.name ?? profile.handle}
                  className="w-20 h-20 rounded-full border-4 border-white object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold">
                  {(profile.user.name ?? profile.handle)[0].toUpperCase()}
                </div>
              )}
              {callerId && callerId !== profile.userId && (
                <ConnectButton
                  targetUserId={profile.userId}
                  currentUserId={callerId}
                  initialStatus={connectionStatus}
                  connectionId={connectionId}
                />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{profile.user.name ?? profile.handle}</h1>
              {(() => {
                const tier = getUserTier({ isPartner: profile.user.isPartner, verificationStatus: profile.user.verificationStatus });
                if (tier === "PARTNER") return <VerifiedBadge tier="PARTNER" />;
                if (tier === "VERIFIED" || profile.verifiedProfessional) return <VerifiedBadge tier="VERIFIED" />;
                return null;
              })()}
            </div>
            {profile.headline && <p className="text-gray-600 mt-0.5">{profile.headline}</p>}
            {profile.currentRole && (
              <p className="text-sm text-gray-500 mt-0.5">{profile.currentRole}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 flex-wrap">
              {profile.location && <span>{profile.location}</span>}
              <span>{connectionCount} connection{connectionCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {profile.summary && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">About</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{profile.summary}</p>
          </div>
        )}

        {profile.experiences.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience</h2>
            <div className="space-y-4">
              {profile.experiences.map((exp) => (
                <div key={exp.id} className="border-l-2 border-blue-200 pl-4">
                  <p className="font-medium text-gray-900 text-sm">{exp.title}</p>
                  <p className="text-sm text-gray-600">{exp.company}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(exp.start).toLocaleDateString()} —{" "}
                    {exp.end ? new Date(exp.end).toLocaleDateString() : "Present"}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-gray-500 mt-1">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.educations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Education</h2>
            <div className="space-y-4">
              {profile.educations.map((edu) => (
                <div key={edu.id} className="border-l-2 border-purple-200 pl-4">
                  <p className="font-medium text-gray-900 text-sm">{edu.institution}</p>
                  {edu.degree && <p className="text-sm text-gray-600">{edu.degree}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(edu.start).toLocaleDateString()} —{" "}
                    {edu.end ? new Date(edu.end).toLocaleDateString() : "Present"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.profileSkills.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Endorsements</h2>
            <div className="space-y-2">
              {profile.profileSkills.map((ps) => {
                const endorsementData = endorsementsBySkill[ps.skillId];
                return (
                  <div key={ps.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-800">{ps.skill.name}</span>
                    {endorsementData && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {endorsementData.count} endorsement{endorsementData.count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {profile.posts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Posts</h2>
            <div className="space-y-4">
              {profile.posts.map((post) => (
                <div key={post.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-gray-800 line-clamp-3">{post.body}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    <span>{post._count.likes} likes</span>
                    <span>{post._count.comments} comments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
