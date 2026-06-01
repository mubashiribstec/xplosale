# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Skip postinstall (prisma generate) — schema not copied yet
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env: satisfy validation (min-length, URL format).
# Real values come from .env at runtime via docker-compose env_file.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV UPSTASH_REDIS_URL="redis://localhost:6379"
ENV NEXTAUTH_SECRET="build-time-placeholder-secret-xxxxxxxxxxxxxxxx"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV CNIC_HASH_SALT="build-time-placeholder-salt-xxxxxxxxxxxxxxxxxxxx"
ENV STORAGE_MODE="local"
ENV NEXT_PUBLIC_STORAGE_MODE="local"
ENV NEXT_TELEMETRY_DISABLED=1

# Generate prisma client now that schema.prisma is available, then build
RUN npx prisma generate
RUN pnpm build

# ── Stage 3: production runner (lean — standalone output only) ────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Uploads directory for local file storage
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Next.js standalone output includes all traced node_modules (incl. prisma)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# messages/*.json use a runtime dynamic import — Next.js file tracer misses them
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1

CMD ["node", "server.js"]
