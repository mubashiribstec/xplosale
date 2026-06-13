/**
 * Playwright global setup:
 * 1. Wires up the test database
 * 2. Seeds three users (BASIC, VERIFIED, ADMIN)
 * 3. Mints JWT session cookies for each and saves them to files
 *    so individual tests can inject them via storageState
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { encode } from "@auth/core/jwt";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://xplosale_test:xplosale_test@localhost:5432/xplosale_test";
const SECRET = process.env.NEXTAUTH_SECRET ?? "0zxW7RvOoIwsaNqdYLk8aJfs6DBT5RH42zPhvTPstEQ=";
const COOKIE_NAME = "authjs.session-token";
const STATE_DIR = path.join(__dirname, ".auth");

async function mintSession(userId: string, role: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    token: {
      sub: userId,
      id: userId,
      role,
      phone: null,
      bannedAt: null,
      tokenVersion: 0,
      roleRefreshedAt: now,
      iat: now,
      exp: now + 30 * 24 * 60 * 60,
      jti: `test-${userId}`,
    },
    secret: SECRET,
    salt: COOKIE_NAME,
  });
  return token;
}

function storageState(cookieValue: string) {
  return {
    cookies: [
      {
        name: COOKIE_NAME,
        value: cookieValue,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

async function setup() {
  fs.mkdirSync(STATE_DIR, { recursive: true });

  // Apply schema to test DB
  execSync(`DATABASE_URL="${TEST_DB}" npx prisma migrate deploy`, {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });

  // Import Prisma with test DB
  process.env.DATABASE_URL = TEST_DB;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB } } });

  await prisma.$connect();

  // Clean slate
  await prisma.notification.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.session.deleteMany().catch(() => {});
  await prisma.account.deleteMany().catch(() => {});
  await prisma.user.deleteMany();

  // Seed users
  const basicUser = await prisma.user.create({
    data: {
      id: "test-basic-user-01",
      phone: "+15550000001",
      name: "Basic User",
      role: "USER",
      verificationStatus: "UNVERIFIED",
    },
  });

  const verifiedUser = await prisma.user.create({
    data: {
      id: "test-verified-user-01",
      phone: "+15550000002",
      name: "Verified User",
      role: "USER",
      verificationStatus: "VERIFIED",
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      id: "test-admin-user-01",
      phone: "+15550000003",
      name: "Admin User",
      role: "ADMIN",
      username: "testadmin",
      verificationStatus: "VERIFIED",
    },
  });

  // Seed job seeker profiles
  await prisma.jobSeekerProfile.createMany({
    data: [
      { userId: basicUser.id, recruiterDiscoverable: true },
      { userId: verifiedUser.id, recruiterDiscoverable: true },
    ],
  });

  await prisma.$disconnect();

  // Mint JWT cookies
  const basicJwt = await mintSession(basicUser.id, "USER");
  const verifiedJwt = await mintSession(verifiedUser.id, "USER");
  const adminJwt = await mintSession(adminUser.id, "ADMIN");

  fs.writeFileSync(
    path.join(STATE_DIR, "basic.json"),
    JSON.stringify(storageState(basicJwt))
  );
  fs.writeFileSync(
    path.join(STATE_DIR, "verified.json"),
    JSON.stringify(storageState(verifiedJwt))
  );
  fs.writeFileSync(
    path.join(STATE_DIR, "admin.json"),
    JSON.stringify(storageState(adminJwt))
  );

  console.log("[setup] Test users seeded and session cookies written to e2e/.auth/");
}

export default setup;
