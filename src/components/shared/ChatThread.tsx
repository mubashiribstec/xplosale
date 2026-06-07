"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@prisma/client";

type MessageWithSender = Message & {
  sender: { id: string; name: string | null };
};

interface ChatThreadProps {
  roomId: string;
  initialMessages: MessageWithSender[];
  currentUserId: string;
  contextType?: string;
  contextLabel?: string;
}

export function ChatThread({ roomId, initialMessages, currentUserId, contextType, contextLabel }: ChatThreadProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>(
    [...initialMessages].reverse()
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isSupport = contextType === "ADMIN_DM";
  const isShopInquiry = contextType === "SHOP_INQUIRY";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      es = new EventSource(`/api/chat/sse?roomId=${roomId}`);
      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as MessageWithSender;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } catch {
          // ignore malformed events
        }
      };
      es.onerror = () => {
        es?.close();
        if (closed) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [roomId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError("");
    setInput("");
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setSendError(json.error ?? "Failed to send. Please try again.");
        setInput(text);
        return;
      }
      const json = (await res.json()) as { ok: boolean; data: MessageWithSender };
      if (json.ok) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev;
          return [...prev, json.data];
        });
      }
    } catch {
      setSendError("Network error. Message not sent.");
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* SHOP_INQUIRY header */}
      {isShopInquiry && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 text-center font-medium">
          🏪 {contextLabel ? `Chat with ${contextLabel}` : "Shop Inquiry"}
        </div>
      )}
      {/* Support header */}
      {isSupport && messages.length === 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-500 text-center">
          Send us a message and our support team will reply as soon as possible.
        </div>
      )}
      {isSupport && messages.length > 0 && (
        <div className="mb-3 text-xs text-center text-gray-400">
          Support team · typically replies within a few hours
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          const isSystem = msg.kind === "SYSTEM";

          // System messages render centered without a bubble
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="max-w-sm px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 whitespace-pre-wrap text-center">
                  {msg.body}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-900 rounded-bl-none"
                }`}
              >
                {!isOwn && (
                  <p className="text-xs font-medium mb-1 opacity-70">{msg.sender.name ?? "Support"}</p>
                )}
                <p className="whitespace-pre-wrap">{msg.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {sendError && (
        <div className="mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
          <span>{sendError}</span>
          <button
            onClick={() => setSendError("")}
            className="text-red-400 hover:text-red-600 font-bold leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); if (sendError) setSendError(""); }}
          onKeyDown={handleKeyDown}
          placeholder={sending ? "Sending…" : "Type a message…"}
          disabled={sending}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={() => void handleSend()}
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
