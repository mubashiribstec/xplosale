/**
 * Realtime adapter — polling implementation for Vercel Hobby.
 *
 * Server: publish() is a no-op stub. Messages are persisted to Postgres
 * and the client polls GET /api/chat/rooms/[id]/messages?since=<cursor>.
 *
 * Future migration: replace this stub with Socket.io emit when self-hosting.
 */

export type RealtimeEvent = {
  channel: string;
  event: string;
  payload: unknown;
};

// Server-side: no-op stub — messages are read directly from DB
export async function publish(_event: RealtimeEvent): Promise<void> {
  // ASSUMPTION: Vercel Hobby has no persistent server state.
  // Real-time delivery is achieved by client polling at 3s intervals.
  // Swap this with socket.emit(event.channel, event.payload) when self-hosting.
}

// Client-side polling interval in milliseconds
export const POLL_INTERVAL_MS = 3000;

// Builds the polling URL for a chat room
export function pollUrl(roomId: string, sinceIso: string): string {
  return `/api/chat/rooms/${encodeURIComponent(roomId)}/messages?since=${encodeURIComponent(sinceIso)}`;
}
