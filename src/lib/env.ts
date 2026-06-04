import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),

  // Storage — S3 vars are optional when STORAGE_MODE=local
  STORAGE_MODE: z.enum(["local", "s3"]).default("s3"),
  SUPABASE_S3_ENDPOINT: z.string().url().optional(),
  SUPABASE_S3_REGION: z.string().default("ap-southeast-1"),
  SUPABASE_S3_ACCESS_KEY: z.string().optional(),
  SUPABASE_S3_SECRET_KEY: z.string().optional(),
  SUPABASE_PUBLIC_BUCKET: z.string().default("xplosale-public"),
  SUPABASE_PRIVATE_BUCKET: z.string().default("xplosale-private"),

  // Redis (rediss:// for Upstash TLS, redis:// for local)
  UPSTASH_REDIS_URL: z.string().url(),

  // App
  CNIC_HASH_SALT: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Cron secrets
  RECOMMENDATION_CRON_SECRET: z.string().min(16).optional(),
  SEARCH_DIGEST_CRON_SECRET: z.string().min(16).optional(),

  // Recommendation engine config
  RECOMMENDATION_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  INVITE_TO_APPLY_DAILY_CAP_PER_COMPANY: z.coerce.number().int().positive().default(20),
  INVITE_TO_APPLY_MONTHLY_CAP_PER_CANDIDATE: z.coerce.number().int().positive().default(5),

  // Search config
  SEARCH_AUTOSUGGEST_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@xplosale.com"),

  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check .env and .env.example.");
  }
  const data = result.data;
  if (data.STORAGE_MODE === "s3") {
    const missing = (["SUPABASE_S3_ENDPOINT", "SUPABASE_S3_ACCESS_KEY", "SUPABASE_S3_SECRET_KEY"] as const).filter(
      (k) => !data[k]
    );
    if (missing.length > 0) {
      throw new Error(`STORAGE_MODE=s3 requires: ${missing.join(", ")}`);
    }
  }
  return data;
}

declare global {
  // eslint-disable-next-line no-var
  var __env: Env | undefined;
}

export const env = globalThis.__env ?? (globalThis.__env = loadEnv());
