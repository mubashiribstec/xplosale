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

