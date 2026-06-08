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

# Build-time placeholders — satisfy env validation during `pnpm build`.
# ARG values are NOT baked into image layers; real values come from .env at runtime.
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ARG DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ARG UPSTASH_REDIS_URL="redis://localhost:6379"
ARG NEXTAUTH_SECRET="build-time-placeholder-secret-xxxxxxxxxxxxxxxx"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ARG CNIC_HASH_SALT="build-time-placeholder-salt-xxxxxxxxxxxxxxxxxxxx"
ARG STORAGE_MODE="local"
ARG NEXT_PUBLIC_STORAGE_MODE="local"
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

# Uploads + runtime writable directories
RUN mkdir -p /app/uploads /app/logs /app/exports \
    && chown nextjs:nodejs /app/uploads /app/logs /app/exports

# Next.js standalone output includes all traced node_modules (incl. prisma)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# messages/*.json use a runtime dynamic import — Next.js file tracer misses them
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages
# @prisma/adapter-pg and pg use pnpm symlinks that NFT doesn't dereference;
# copy them explicitly so the standalone runner can find them at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg ./node_modules/pg

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1

CMD ["node", "server.js"]
