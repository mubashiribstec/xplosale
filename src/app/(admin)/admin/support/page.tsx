import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminSupportPage() {
  const rooms = await prisma.chatRoom.findMany({
    where: { contextType: "ADMIN_DM" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      participantA: { select: { id: true, name: true, role: true } },
      participantB: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Support Inbox</h1>
      {rooms.length === 0 ? (
        <p className="text-gray-500">No support conversations yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Last message</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms.map((room) => {
                const user =
                  room.participantA.role !== "ADMIN" ? room.participantA : room.participantB;
                const lastMsg = room.messages[0];
                return (
                  <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{user.name ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                      {lastMsg?.body ?? <span className="italic text-gray-400">No messages yet</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {lastMsg
                        ? new Date(lastMsg.createdAt).toLocaleDateString()
                        : new Date(room.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/chat/${room.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Reply
                      </Link>
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
