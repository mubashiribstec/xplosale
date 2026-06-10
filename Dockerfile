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

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Create runtime-writable directories and give nextjs user ownership of /app
# so that next start can write .next/cache entries at runtime.
RUN mkdir -p /app/uploads /app/logs /app/exports \
    && chown -R nextjs:nodejs /app

# Copy built output and full node_modules (non-standalone: all deps stay in node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# messages/*.json use a runtime dynamic import — Next.js file tracer misses them
COPY --from=builder --chown=nextjs:nodejs /app/messages ./messages

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1

CMD ["npx", "next", "start"]
