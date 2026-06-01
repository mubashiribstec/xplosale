/**
 * Backfill searchVector for all existing rows.
 * Idempotent — uses triggers via dummy UPDATE to populate the column.
 *
 * Usage: pnpm tsx scripts/backfill-search.ts
 */
import { prisma } from "../src/lib/prisma";

const BATCH = 500;

async function backfillTable(table: string, countQuery: string) {
  const [{ count }] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery);
  const total = Number(count);
  console.log(`  ${table}: ${total} rows`);

  let done = 0;
  while (done < total) {
    // Touch rows so triggers fire and populate searchVector
    await prisma.$executeRawUnsafe(`
      UPDATE "${table}"
      SET "updatedAt" = "updatedAt"
      WHERE id IN (
        SELECT id FROM "${table}"
        WHERE "searchVector" IS NULL
        LIMIT ${BATCH}
      )
    `);
    done = Math.min(done + BATCH, total);
    process.stdout.write(`\r    ${done}/${total}`);
  }
  console.log();
}

// For models without updatedAt, use a different column
async function backfillNoUpdatedAt(table: string, countQuery: string, touchCol: string) {
  const [{ count }] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(countQuery);
  const total = Number(count);
  console.log(`  ${table}: ${total} rows`);

  let done = 0;
  while (done < total) {
    await prisma.$executeRawUnsafe(`
      UPDATE "${table}"
      SET "${touchCol}" = "${touchCol}"
      WHERE id IN (
        SELECT id FROM "${table}"
        WHERE "searchVector" IS NULL
        LIMIT ${BATCH}
      )
    `);
    done = Math.min(done + BATCH, total);
    process.stdout.write(`\r    ${done}/${total}`);
  }
  console.log();
}

async function main() {
  console.log("Backfilling searchVector columns…\n");

  await backfillTable("Listing",        `SELECT count(*) FROM "Listing"`);
  await backfillTable("JobPosting",     `SELECT count(*) FROM "JobPosting"`);
  await backfillTable("NetworkProfile", `SELECT count(*) FROM "NetworkProfile"`);
  await backfillNoUpdatedAt("Company",  `SELECT count(*) FROM "Company"`, "createdAt");

  // Verify
  const [listingNull] = await prisma.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM "Listing" WHERE "searchVector" IS NULL`;
  const [jobNull] = await prisma.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM "JobPosting" WHERE "searchVector" IS NULL`;
  const [profileNull] = await prisma.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM "NetworkProfile" WHERE "searchVector" IS NULL`;
  const [companyNull] = await prisma.$queryRaw<[{ n: bigint }]>`SELECT count(*) AS n FROM "Company" WHERE "searchVector" IS NULL`;

  console.log("\nRemaining NULL rows:");
  console.log(`  Listing:        ${listingNull.n}`);
  console.log(`  JobPosting:     ${jobNull.n}`);
  console.log(`  NetworkProfile: ${profileNull.n}`);
  console.log(`  Company:        ${companyNull.n}`);
  console.log("\nBackfill complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
