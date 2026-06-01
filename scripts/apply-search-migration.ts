/**
 * Apply Phase 25 search infrastructure to the database.
 * Idempotent — safe to run multiple times.
 *
 * Usage: pnpm tsx scripts/apply-search-migration.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Applying search infrastructure migration…");

  const sql = readFileSync(join(__dirname, "../prisma/migrations/search_infra.sql"), "utf-8");

  // Split on statement boundaries (;) and execute each non-empty statement
  const statements = sql
    .split(/;\s*(?=\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      const preview = statement.slice(0, 80).replace(/\n/g, " ");
      console.log(`  ✓ ${preview}…`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Skip "already exists" errors — idempotency
      if (msg.includes("already exists")) {
        console.log(`  ~ already exists, skipping`);
      } else {
        console.error(`  ✗ ${err}`);
        throw err;
      }
    }
  }

  console.log("\nDone. Run `pnpm tsx scripts/backfill-search.ts` to populate existing rows.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
