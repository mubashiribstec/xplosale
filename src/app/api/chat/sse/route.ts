import { type NextRequest } from "next/server";
import Redis from "ioredis";
import { err } from "@/lib/http";
import { requireSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const SSE_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 15_000;

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return err("Unauthorized", 401);
  const userId = getUserId(session);

  const roomId = req.nextUrl.searchParams.get("roomId");
  if (!roomId) return err("roomId is required", 400);

  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) return err("Room not found", 404);
  if (room.participantAId !== userId && room.participantBId !== userId) {
    return err("Forbidden", 403);
  }

  const subscriber = new Redis(env.UPSTASH_REDIS_URL, {
    tls: env.UPSTASH_REDIS_URL.startsWith("rediss://") ? {} : undefined,
    lazyConnect: true,
  });

  const encoder = new TextEncoder();
  const channel = `chat:room:${roomId}`;

  const stream = new ReadableStream({
    start(controller) {
      let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
      let closed = false;

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatTimer);
        clearTimeout(timeoutTimer);
        subscriber.unsubscribe(channel).catch(() => {});
        subscriber.disconnect();
        try { controller.close(); } catch { /* already closed */ }
      }

      subscriber.subscribe(channel, (subscribeErr) => {
        if (subscribeErr) {
          close();
          return;
        }

        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            close();
          }
        }, HEARTBEAT_MS);

        timeoutTimer = setTimeout(close, SSE_TIMEOUT_MS);
      });

      subscriber.on("message", (_ch: string, msg: string) => {
        try {
          controller.enqueue(encoder.encode("data: " + msg + "\n\n"));
        } catch {
          close();
        }
      });

      subscriber.on("error", () => close());
    },
    cancel() {
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
