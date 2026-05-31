import { redirect } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { ChatInbox } from "@/components/shared/ChatInbox";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const userId = getUserId(session);

  const rooms = await prisma.chatRoom.findMany({
    where: {
      OR: [{ participantAId: userId }, { participantBId: userId }],
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      participantA: { select: { id: true, name: true } },
      participantB: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      <ChatInbox rooms={rooms} userId={userId} />
    </main>
  );
}
