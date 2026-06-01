import { redirect, notFound } from "next/navigation";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { ChatThread } from "@/components/shared/ChatThread";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const userId = getUserId(session);

  const { roomId } = await params;

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) notFound();
  if (room.participantAId !== userId && room.participantBId !== userId) {
    redirect("/chat");
  }

  const initialMessages = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      sender: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col h-screen">
      <ChatThread
        roomId={roomId}
        initialMessages={initialMessages}
        currentUserId={userId}
      />
    </main>
  );
}
