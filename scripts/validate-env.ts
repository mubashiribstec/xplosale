import "dotenv/config";

const REQUIRED = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "UPSTASH_REDIS_URL",
  "CNIC_HASH_SALT",
] as const;

const S3_REQUIRED = [
  "SUPABASE_S3_ENDPOINT",
  "SUPABASE_S3_ACCESS_KEY",
  "SUPABASE_S3_SECRET_KEY",
] as const;

let errors = 0;

function check(key: string, value: string | undefined, rules: { minLen?: number; isUrl?: boolean } = {}) {
  if (!value) {
    console.error(`  ✗  ${key}: missing`);
    errors++;
    return;
  }
  if (rules.minLen && value.length < rules.minLen) {
    console.error(`  ✗  ${key}: too short (min ${rules.minLen} chars)`);
    errors++;
    return;
  }
  if (rules.isUrl) {
    try { new URL(value); } catch {
      console.error(`  ✗  ${key}: not a valid URL`);
      errors++;
      return;
    }
  }
  console.log(`  ✓  ${key}`);
}

console.log("\n── Required vars ──────────────────────────────");
for (const key of REQUIRED) {
  const rules = key.includes("URL") ? { isUrl: true } : key.includes("SECRET") || key.includes("SALT") ? { minLen: 32 } : {};
  check(key, process.env[key], rules);
}

const storageMode = process.env.STORAGE_MODE ?? "s3";
console.log(`\n── Storage (STORAGE_MODE=${storageMode}) ──────────────`);
if (storageMode === "s3") {
  for (const key of S3_REQUIRED) {
    check(key, process.env[key]);
  }
} else {
  console.log("  ✓  Local storage mode — S3 vars not required");
}

console.log("\n──────────────────────────────────────────────");
if (errors === 0) {
  console.log(`  ✅  All checks passed (${REQUIRED.length + (storageMode === "s3" ? S3_REQUIRED.length : 0)} vars)\n`);
  process.exit(0);
} else {
  console.error(`  ❌  ${errors} error(s) — fix before deploying\n`);
  process.exit(1);
}
