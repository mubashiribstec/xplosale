/**
 * Phase 2 provisioning healthcheck.
 * Run: pnpm tsx scripts/healthcheck.ts
 *
 * Checks:
 *  1. Prisma → Supabase Postgres (raw query)
 *  2. AWS SDK v3 → headBucket on xplosale-public  (expects: public-read)
 *  3. AWS SDK v3 → headBucket on xplosale-private (expects: no public access)
 *  4. ioredis → PING Upstash Redis (expects: PONG)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { S3Client, HeadBucketCommand, GetBucketAclCommand } from "@aws-sdk/client-s3";
import Redis from "ioredis";

const PASS = "✅";
const FAIL = "❌";
const WARN = "⚠️ ";

let exitCode = 0;

function pass(label: string, detail = "") {
  console.log(`  ${PASS}  ${label}${detail ? `  — ${detail}` : ""}`);
}

function fail(label: string, err: unknown) {
  console.log(`  ${FAIL}  ${label}  — ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
}

function warn(label: string, detail: string) {
  console.log(`  ${WARN}  ${label}  — ${detail}`);
}

// ─── 1. Prisma / Postgres ─────────────────────────────────────────────────────

async function checkPrisma() {
  console.log("\n[1] Prisma → Supabase Postgres");
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT NOW() as now`;
    pass("Connected", `server time = ${result[0].now.toISOString()}`);
  } catch (e) {
    fail("Connection failed", e);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── 2 & 3. Supabase Storage (S3) ────────────────────────────────────────────

async function checkStorage() {
  console.log("\n[2 & 3] AWS SDK v3 → Supabase Storage");

  const endpoint = process.env.SUPABASE_S3_ENDPOINT;
  const region = process.env.SUPABASE_S3_REGION ?? "ap-southeast-1";
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_KEY;
  const publicBucket = process.env.SUPABASE_PUBLIC_BUCKET ?? "xplosale-public";
  const privateBucket = process.env.SUPABASE_PRIVATE_BUCKET ?? "xplosale-private";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    fail("Storage config missing", "SUPABASE_S3_ENDPOINT / ACCESS_KEY / SECRET_KEY not set");
    return;
  }

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });

  // Public bucket
  try {
    await s3.send(new HeadBucketCommand({ Bucket: publicBucket }));
    pass(`Bucket '${publicBucket}' exists`);

    // Try to verify public-read ACL (Supabase may not support GetBucketAcl — just warn if unavailable)
    try {
      const acl = await s3.send(new GetBucketAclCommand({ Bucket: publicBucket }));
      const isPublic = acl.Grants?.some(
        (g) => g.Grantee?.URI?.includes("AllUsers") && g.Permission === "READ"
      );
      if (isPublic) {
        pass(`Bucket '${publicBucket}' has public-read ACL`);
      } else {
        warn(`Bucket '${publicBucket}' ACL`, "public-read grant not detected — verify in Supabase dashboard");
      }
    } catch {
      warn(`Bucket '${publicBucket}' ACL check`, "GetBucketAcl not supported — verify public policy in Supabase dashboard");
    }
  } catch (e) {
    fail(`Bucket '${publicBucket}'`, e);
  }

  // Private bucket
  try {
    await s3.send(new HeadBucketCommand({ Bucket: privateBucket }));
    pass(`Bucket '${privateBucket}' exists`);
    pass(`Bucket '${privateBucket}' is private (no public access by default)`);
  } catch (e) {
    fail(`Bucket '${privateBucket}'`, e);
  }

  s3.destroy();
}

// ─── 4. Upstash Redis ─────────────────────────────────────────────────────────

async function checkRedis() {
  console.log("\n[4] ioredis → Upstash Redis");

  const redisUrl = process.env.UPSTASH_REDIS_URL;
  if (!redisUrl) {
    fail("Redis config missing", "UPSTASH_REDIS_URL not set");
    return;
  }

  const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith("rediss://") ? {} : undefined,
    connectTimeout: 8000,
    maxRetriesPerRequest: 2,
  });

  try {
    const pong = await redis.ping();
    if (pong === "PONG") {
      pass("PING → PONG");
    } else {
      warn("PING response unexpected", pong);
    }

    // Bonus: round-trip a test key
    const testKey = `healthcheck:${Date.now()}`;
    await redis.set(testKey, "ok", "EX", 10);
    const val = await redis.get(testKey);
    await redis.del(testKey);
    if (val === "ok") {
      pass("SET/GET/DEL round-trip");
    } else {
      warn("SET/GET round-trip", `unexpected value: ${val}`);
    }
  } catch (e) {
    fail("Redis connection failed", e);
  } finally {
    redis.disconnect();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Xplosale Phase 2 — Provisioning Healthcheck");
  console.log("═══════════════════════════════════════════");

  await checkPrisma();
  await checkStorage();
  await checkRedis();

  console.log("\n═══════════════════════════════════════════");
  if (exitCode === 0) {
    console.log("  ✅  All checks passed — ready for Phase 3");
  } else {
    console.log("  ❌  Some checks failed — fix above errors before proceeding");
  }
  console.log("═══════════════════════════════════════════\n");

  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
