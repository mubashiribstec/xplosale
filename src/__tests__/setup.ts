// Global test setup
// Set required env vars for tests that import env.ts
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.DIRECT_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long";
process.env.UPSTASH_REDIS_URL = "rediss://default:token@localhost:6379";
process.env.CNIC_HASH_SALT = "test-cnic-salt-at-least-32-characters";
// Local storage avoids the S3 env-var requirement in env.ts when test modules
// import it (otherwise loadEnv throws and the whole suite fails to load).
process.env.STORAGE_MODE = "local";
// NODE_ENV is typed read-only by @types/node; assign through a cast.
(process.env as Record<string, string>).NODE_ENV = "test";
