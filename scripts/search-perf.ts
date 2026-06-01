/**
 * Phase 25 performance test for Postgres full-text search.
 * Targets: single-vertical p95 < 200ms, universal p95 < 400ms, suggest p95 < 100ms
 *
 * Usage: pnpm tsx scripts/search-perf.ts
 *
 * Prerequisites:
 *   1. Apply search migration:  pnpm tsx scripts/apply-search-migration.ts
 *   2. Backfill vectors:        pnpm tsx scripts/backfill-search.ts
 *   3. Seed data (ideally 50k+ listings, 20k+ jobs, 10k+ profiles)
 */
import { searchClient } from "../src/core/search/postgres";

const SAMPLE_QUERIES = [
  "software engineer", "lahore", "dha", "react developer",
  "apartment for sale", "3 bed", "commercial plot",
  "marketing manager", "driver", "call center",
  "python", "javascript", "sales", "interior design",
  "honda civic", "toyota", "rent", "buy house",
  "remote job", "data analyst",
];

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

async function runBench(name: string, fn: () => Promise<unknown>, iterations: number) {
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await fn();
    times.push(Date.now() - start);
  }
  times.sort((a, b) => a - b);
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const p99 = percentile(times, 99);
  const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
  const pass = p95 < (name.includes("suggest") ? 100 : name.includes("universal") ? 400 : 200);
  console.log(`${pass ? "✓" : "✗"} ${name.padEnd(30)} p50=${p50}ms  p95=${p95}ms  p99=${p99}ms  avg=${avg}ms`);
  return { p95, pass };
}

async function main() {
  console.log("Search performance benchmark\n");

  const results: { p95: number; pass: boolean }[] = [];

  // Single-vertical searches (target: p95 < 200ms)
  results.push(await runBench("marketplace search", async () => {
    const q = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
    return searchClient.search({ vertical: "marketplace", query: q, limit: 20 });
  }, 100));

  results.push(await runBench("jobs search", async () => {
    const q = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
    return searchClient.search({ vertical: "jobs", query: q, limit: 20 });
  }, 100));

  results.push(await runBench("network search", async () => {
    const q = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
    return searchClient.search({ vertical: "network", query: q, limit: 20 });
  }, 100));

  results.push(await runBench("company search", async () => {
    const q = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
    return searchClient.search({ vertical: "companies", query: q, limit: 20 });
  }, 100));

  // Universal search (target: p95 < 400ms)
  results.push(await runBench("universal search", async () => {
    const q = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)];
    return searchClient.universal({ query: q, limitPerVertical: 4 });
  }, 100));

  // Suggest (target: p95 < 100ms — first call, no cache)
  results.push(await runBench("suggest (cold)", async () => {
    const prefix = SAMPLE_QUERIES[Math.floor(Math.random() * SAMPLE_QUERIES.length)].slice(0, 4);
    return searchClient.suggest({ vertical: "universal", prefix });
  }, 100));

  // SQL injection safety
  console.log("\nInjection safety test:");
  const dangerousInputs = ["'; DROP TABLE \"Listing\";--", "<script>", "' OR 1=1 --", "\x00test"];
  for (const input of dangerousInputs) {
    const result = await searchClient.search({ vertical: "marketplace", query: input });
    console.log(`  input="${input.slice(0, 30)}" → hits=${result.hits.length} (no crash) ✓`);
  }

  const allPassed = results.every((r) => r.pass);
  console.log(`\n${allPassed ? "All targets met ✓" : "Some targets missed ✗"}`);
  if (!allPassed) process.exit(1);
}

main()
  .catch(console.error)
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
