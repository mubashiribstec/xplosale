import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SupportBanActions from "@/components/shared/SupportBanActions";

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function AdminSupportPage() {
  const rooms = await prisma.chatRoom.findMany({
    where: { contextType: "ADMIN_DM" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { role: true } } },
      },
      participantA: { select: { id: true, name: true, role: true, bannedAt: true } },
      participantB: { select: { id: true, name: true, role: true, bannedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sort by most recent message activity (rooms with recent messages first)
  const sorted = [...rooms].sort((a, b) => {
    const aTime = a.messages[0]?.createdAt ?? a.createdAt;
    const bTime = b.messages[0]?.createdAt ?? b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const needsReply = sorted.filter((r) => {
    const last = r.messages[0];
    return last && last.sender.role !== "ADMIN";
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Support Inbox</h1>
        {needsReply > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            {needsReply} need{needsReply !== 1 ? "s" : ""} reply
          </span>
        )}
      </div>
      {sorted.length === 0 ? (
        <p className="text-gray-500">No support conversations yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Last message</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">When</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((room) => {
                const user =
                  room.participantA.role !== "ADMIN" ? room.participantA : room.participantB;
                const lastMsg = room.messages[0];
                const awaitingReply = lastMsg && lastMsg.sender.role !== "ADMIN";
                return (
                  <tr key={room.id} className={`hover:bg-gray-50 transition-colors ${awaitingReply ? "bg-amber-50/40" : ""}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {user.name ?? "—"}
                        {awaitingReply && (
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Awaiting reply" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                      {lastMsg?.body ?? <span className="italic text-gray-400">No messages yet</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {lastMsg
                        ? relativeTime(new Date(lastMsg.createdAt))
                        : relativeTime(new Date(room.createdAt))}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <SupportBanActions roomId={room.id} userId={user.id} banned={!!user.bannedAt} />
                        <Link
                          href={`/chat/${room.id}`}
                          className={`font-medium ${awaitingReply ? "text-amber-700 hover:text-amber-900" : "text-blue-600 hover:underline"}`}
                        >
                          {awaitingReply ? "Reply ↗" : "View"}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
