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

  const [initialMessages, shopName] = await Promise.all([
    prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        sender: { select: { id: true, name: true } },
      },
    }),
    room.contextType === "SHOP_INQUIRY" && room.contextId
      ? prisma.shop.findUnique({ where: { id: room.contextId }, select: { name: true } }).then((s) => s?.name ?? null)
      : Promise.resolve(null),
  ]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col" style={{ height: "calc(100vh - 62px)" }}>
      <ChatThread
        roomId={roomId}
        initialMessages={initialMessages}
        currentUserId={userId}
        contextType={room.contextType}
        contextLabel={shopName ?? undefined}
      />
    </main>
  );
}
