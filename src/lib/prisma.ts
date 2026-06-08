import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

// Cache the client across module re-evaluations in every environment.
// Without this, repeated module loads construct new PrismaClient/pg pools
// that are never reused, exhausting Postgres connections under load.
globalThis.__prisma = prisma;
