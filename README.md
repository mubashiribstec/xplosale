# Xplosale

Pakistan's trust-first multi-vertical marketplace — real estate listings, jobs, and professional networking.

## Verticals

- **Marketplace** `/m` — property listings with FBR valuation, offer flow, escrow
- **Jobs** `/jobs` — job postings, applications, company profiles
- **Network** `/n` — professional profiles, feed, connections, endorsements

## Stack

- Next.js 16 (App Router, standalone output)
- Prisma 7 + PostgreSQL
- NextAuth v5 (phone OTP)
- Upstash Redis (rate limiting, pub/sub)
- Supabase S3 (object storage) or local filesystem
- `sharp` for image processing → WebP
- `next-intl` v4 (English + Urdu, RTL)
- PWA (service worker, installable)

## Local Development

### Prerequisites
- Node.js 22+, pnpm 9+
- PostgreSQL 16 and Redis 7 (or use Docker Compose)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env and fill in values
cp .env.example .env
# Edit .env — set STORAGE_MODE=local for local dev

# 3. Start infrastructure (if using Docker)
docker compose up postgres redis -d

# 4. Run migrations and seed
pnpm prisma:migrate
pnpm prisma:seed

# 5. Start dev server
pnpm dev
```

### Environment

```bash
# Validate all required env vars
pnpm validate:env

# Run healthcheck (requires running services)
pnpm healthcheck
```

## Production (Docker)

```bash
# Build image
pnpm docker:build

# Run with env file
pnpm docker:run
```

Or use Docker Compose:
```bash
docker compose up
```

## Database

```bash
pnpm prisma:migrate    # run pending migrations
pnpm prisma:seed       # seed demo data
pnpm prisma:studio     # open Prisma Studio
```

## Environment Variables

See `.env.example` for all required variables with documentation.

Key vars:
| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL connection (pooler for runtime) |
| `DIRECT_URL` | ✓ | PostgreSQL direct connection (for migrations) |
| `NEXTAUTH_SECRET` | ✓ | ≥32 char secret for NextAuth JWT |
| `UPSTASH_REDIS_URL` | ✓ | Redis URL (`redis://` local or `rediss://` Upstash) |
| `CNIC_HASH_SALT` | ✓ | ≥32 char salt for CNIC hashing |
| `STORAGE_MODE` | — | `local` (default dev) or `s3` (production) |
| `SUPABASE_S3_*` | S3 only | S3 credentials for Supabase storage |
