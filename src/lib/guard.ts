import { getSession, requireSession } from "@/core/auth/session";
import { err } from "@/lib/http";
import type { Session } from "next-auth";

type SessionUser = {
  id: string;
  role: string;
  bannedAt?: string | null;
};

function getUser(session: Session): SessionUser {
  return session.user as unknown as SessionUser;
}

export function isAdmin(session: Session | null): boolean {
  if (!session) return false;
  return getUser(session).role === "ADMIN";
}

export function isPartner(session: Session | null): boolean {
  if (!session) return false;
  const role = getUser(session).role;
  return role === "PARTNER" || role === "ADMIN";
}

export function isBanned(session: Session | null): boolean {
  if (!session) return false;
  return !!getUser(session).bannedAt;
}

export function getUserId(session: Session): string {
  return getUser(session).id;
}

export async function guardSession() {
  const session = await requireSession().catch(() => null);
  if (!session) return { session: null, user: null, response: err("Unauthorized", 401) };
  const user = getUser(session);
  if (user.bannedAt) return { session: null, user: null, response: err("Your account has been suspended", 403) };
  return { session, user, response: null };
}

export async function guardAdmin() {
  const { session, user, response } = await guardSession();
  if (response) return { session: null, user: null, response };
  if (user!.role !== "ADMIN") return { session: null, user: null, response: err("Forbidden", 403) };
  return { session, user, response: null };
}

export async function getOptionalSession() {
  const session = await getSession();
  return session;
}
