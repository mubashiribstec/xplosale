import { type NextRequest } from "next/server";
import { err } from "@/lib/http";
import { getSession, getUserId } from "@/core/auth/session";
import { prisma } from "@/lib/prisma";
import { subscribe } from "@/core/realtime/bus";

const SSE_TIMEOUT_MS = 5 * 60 * 1000;
const HEARTBEAT_MS = 15_000;

type Params = { params: Promise<{ id: string }> };

/** GET /api/shops/[id]/orders/stream — live order events for the shop owner. */
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return err("Unauthorized", 401);
  const userId = getUserId(session);

  const { id: shopId } = await params;
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerUserId: true } });
  if (!shop) return err("Shop not found", 404);
  if (shop.ownerUserId !== userId) return err("Forbidden", 403);

  const encoder = new TextEncoder();
  const channel = `rt:shop:${shopId}:orders`;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatTimer);
        clearTimeout(timeoutTimer);
        unsubscribe?.();
        try { controller.close(); } catch { /* already closed */ }
      };

      unsubscribe = subscribe(channel, (msg) => {
        try {
          controller.enqueue(encoder.encode("data: " + msg + "\n\n"));
        } catch {
          close();
        }
      });

      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          close();
        }
      }, HEARTBEAT_MS);

      const timeoutTimer = setTimeout(close, SSE_TIMEOUT_MS);
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
