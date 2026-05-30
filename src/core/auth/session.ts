import { auth } from "./auth.config";
import type { Session } from "next-auth";

export async function getSession(): Promise<Session | null> {
  return auth();
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export function getUserId(session: Session): string {
  return (session.user as { id: string }).id;
}
