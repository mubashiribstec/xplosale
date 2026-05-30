import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),

  // Supabase Storage (S3-compatible)
  SUPABASE_S3_ENDPOINT: z.string().url(),
  SUPABASE_S3_REGION: z.string().default("ap-southeast-1"),
  SUPABASE_S3_ACCESS_KEY: z.string(),
  SUPABASE_S3_SECRET_KEY: z.string(),
  SUPABASE_PUBLIC_BUCKET: z.string().default("xplosale-public"),
  SUPABASE_PRIVATE_BUCKET: z.string().default("xplosale-private"),

  // Upstash Redis
  UPSTASH_REDIS_URL: z.string().url(),

  // App
  CNIC_HASH_SALT: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check .env and .env.example.");
  }
  return result.data;
}

// Singleton: only validate once per process
declare global {
  // eslint-disable-next-line no-var
  var __env: Env | undefined;
}

export const env = globalThis.__env ?? (globalThis.__env = loadEnv());
