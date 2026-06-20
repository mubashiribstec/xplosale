"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ChatThread } from "@/components/shared/ChatThread";
import type { Message } from "@prisma/client";

type MessageWithSender = Message & {
  sender: { id: string; name: string | null };
};

export default function BannedSupportChat() {
  const { data: session } = useSession();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const userId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    if (!userId || roomId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/support/room", { method: "POST" });
        const json = (await res.json()) as { ok: boolean; data?: { roomId?: string }; error?: string };
        if (!res.ok || !json.ok) {
          if (!cancelled) setError(json.error ?? "Unable to open support chat.");
          return;
        }
        const rid = json.data!.roomId!;
        const msgRes = await fetch(`/api/chat/rooms/${rid}/messages`);
        const msgJson = (await msgRes.json()) as { ok: boolean; data?: MessageWithSender[] };
        if (cancelled) return;
        setRoomId(rid);
        if (msgJson.ok && msgJson.data) setMessages([...msgJson.data].reverse());
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, roomId]);

  if (!userId) return null;

  if (loading) {
    return <p style={{ fontSize: 13, color: "var(--ink-faint)", textAlign: "center" }}>Connecting to support…</p>;
  }

  if (error) {
    return <p style={{ fontSize: 13, color: "var(--clay)", textAlign: "center" }}>{error}</p>;
  }

  if (!roomId) return null;

  return (
    <div style={{ height: 420, display: "flex", flexDirection: "column" }}>
      <ChatThread
        roomId={roomId}
        initialMessages={messages}
        currentUserId={userId}
        contextType="ADMIN_DM"
      />
    </div>
  );
}
