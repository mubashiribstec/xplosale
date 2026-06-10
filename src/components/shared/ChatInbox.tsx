"use client";

import Link from "next/link";
import type { ChatRoom, Message } from "@prisma/client";

type RoomWithParticipants = ChatRoom & {
  messages: Message[];
  participantA: { id: string; name: string | null };
  participantB: { id: string; name: string | null };
};

interface ChatInboxProps {
  rooms: RoomWithParticipants[];
  userId: string;
}

export function ChatInbox({ rooms, userId }: ChatInboxProps) {
  if (rooms.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
        <p className="text-gray-500 text-sm">No conversations yet.</p>
        <Link href="/m" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
          Browse the marketplace
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
      {rooms.map((room) => {
        const other =
          room.participantA.id === userId ? room.participantB : room.participantA;
        const lastMessage = room.messages[0];

        return (
          <li key={room.id}>
            <Link
              href={`/chat/${room.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{other.name ?? "User"}</p>
                {lastMessage && (
                  <p className="text-sm text-gray-500 truncate">{lastMessage.body}</p>
                )}
              </div>
              {lastMessage && (
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(lastMessage.createdAt).toLocaleDateString()}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
