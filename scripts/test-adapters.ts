/**
 * Phase 3 adapter round-trip tests.
 * Run with: pnpm tsx scripts/test-adapters.ts
 * Requires a valid .env with live credentials.
 */

import "dotenv/config";
import { putObject, getPresignedGet, deleteObject } from "@/core/adapters/storage";
import { kvSet, kvGet, kvDel } from "@/core/adapters/kv";
import { kv } from "@/core/adapters/kv";
import { rateLimit } from "@/lib/rate-limit";

const PASS = "✅";
const FAIL = "❌";
let exitCode = 0;

function pass(label: string, detail = "") {
  console.log(`  ${PASS}  ${label}${detail ? `  — ${detail}` : ""}`);
}

function fail(label: string, err: unknown) {
  console.log(`  ${FAIL}  ${label}  — ${err instanceof Error ? err.message : String(err)}`);
  exitCode = 1;
}

async function testStorage() {
  console.log("\n[1] Storage adapter — xplosale-private round-trip");
  const testKey = `test/adapter-check-${Date.now()}.txt`;
  const testBody = Buffer.from("xplosale-adapter-test-ok");

  try {
    await putObject("private", testKey, testBody, "text/plain");
    pass("putObject to xplosale-private");

    const url = await getPresignedGet("private", testKey, 30);
    if (!url.startsWith("https://")) throw new Error(`unexpected presigned URL: ${url}`);
    pass("getPresignedGet returned HTTPS URL", url.slice(0, 60) + "...");

    await deleteObject("private", testKey);
    pass("deleteObject cleaned up test key");
  } catch (e) {
    fail("Storage round-trip", e);
  }
}

async function testKv() {
  console.log("\n[2] KV adapter — Redis set/get/del with TTL");
  const testKey = `test:adapter:${Date.now()}`;

  try {
    await kvSet(testKey, "hello-xplosale", 30);
    pass("kvSet with 30s TTL");

    const val = await kvGet(testKey);
    if (val !== "hello-xplosale") throw new Error(`expected 'hello-xplosale', got '${val}'`);
    pass("kvGet returned correct value");

    await kvDel(testKey);
    const gone = await kvGet(testKey);
    if (gone !== null) throw new Error(`expected null after del, got '${gone}'`);
    pass("kvDel removed key");
  } catch (e) {
    fail("KV round-trip", e);
  }
}

async function testRateLimit() {
  console.log("\n[3] Rate-limit adapter — sliding window increment");
  const testKey = `test:rl:${Date.now()}`;

  try {
    const r1 = await rateLimit(testKey, 5, 60);
    if (!r1.allowed) throw new Error("first call should be allowed");
    pass(`Attempt 1: allowed=true, remaining=${r1.remaining}`);

    const r2 = await rateLimit(testKey, 5, 60);
    pass(`Attempt 2: allowed=${r2.allowed}, remaining=${r2.remaining}`);

    // Cleanup
    await kv.del(`rl:${testKey}`);
    pass("Rate-limit test key cleaned up");
  } catch (e) {
    fail("Rate-limit", e);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Xplosale Phase 3 — Adapter Tests");
  console.log("═══════════════════════════════════════════");

  await testStorage();
  await testKv();
  await testRateLimit();

  console.log("\n═══════════════════════════════════════════");
  if (exitCode === 0) {
    console.log("  ✅  All adapter tests passed");
  } else {
    console.log("  ❌  Some tests failed — check errors above");
  }
  console.log("═══════════════════════════════════════════\n");

  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
