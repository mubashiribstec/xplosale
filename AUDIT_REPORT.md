# Xplosale — Full-Site Audit Report

**Branch:** `audit/baseline`
**Date:** 2026-06-02
**Scope:** Phases 1–28 (marketplace + jobs + network, ATS + assessments + admin, search + recommendations)
**Pass:** 1 (read-only audit). No application code was modified.

---

## Pass 0 — Baseline & Inventory

### Toolchain results

| Check | Result |
|---|---|
| `pnpm install` | ✅ Clean. Lockfile in sync. `postinstall` runs `prisma generate` OK (Prisma 7.8.0). |
| `pnpm build` | ❌ **FAILS.** Turbopack: `Module not found: Can't resolve 'fs/promises'` ×3 in `src/core/adapters/storage.ts`, pulled into the **client bundle** via `ListingCard.tsx` (`"use client"`) → `MarketplaceShell.tsx`. Not suppressible by `ignoreBuildErrors` (module-resolution, not TS). |
| `pnpm tsc --noEmit` | 1 error: `next.config.ts(12,3)` — `'eslint' does not exist in type 'NextConfig'`. (App source is otherwise clean.) |
| `pnpm lint` (`next lint`) | ❌ Broken under Next 16 (`next lint` deprecated; misparses args). ESLint direct: **9 errors, 30 warnings**. |
| `pnpm prisma validate` | ✅ Schema valid. |
| `prisma migrate status` | ⚠️ Could not run (no DB URL in audit env). **Static drift analysis below shows 23 un-migrated models.** |

### Inventory

| Item | Count |
|---|---|
| API routes (`src/app/api/**/route.ts`) | 104 |
| Pages (`page.tsx`) | 52 |
| Server actions (`"use server"`) | 1 |
| Client components (`"use client"`) | 48 |
| Prisma models | 51 |
| Prisma enums | 25 |
| `dangerouslySetInnerHTML` | 2 |
| Raw SQL call sites (`$queryRaw` etc.) | search module only (parameterized) |
| `sitemap.ts` / `robots.ts` | **0 (missing)** |
| `not-found.tsx` / `error.tsx` / `global-error.tsx` | **0 (missing)** |
| `generateMetadata` / `metadata` exports | **1 (whole app)** |

### Migration drift (CRITICAL)

Only one migration exists: `20260531074859_init` (covers Phases ~1–15). **23 models in `schema.prisma` have no migration** — every Phase 16+ table:

```
Account, ApplicationTag, CandidateDoNotContact, CandidateMatch, CandidateNote,
CandidateTag, EmailSendLog, EmailTemplate, HiringTeam, InviteToApply,
JobRecommendation, PartnerApplication, PipelineStage, ResumeParsed, SavedSearch,
SearchClickLog, Session, TestAssignment, TestQuestion, TestSession,
TestSubmission, TestTemplate, VerificationToken
```

Plus `prisma/migrations/search_infra.sql` — a **raw, un-tracked SQL file** (not a Prisma migration) for the `tsvector` columns/GIN indexes/triggers. A fresh `prisma migrate deploy` would produce a DB missing 23 tables → app non-functional in a clean deploy. The schema has been kept in sync only via `prisma db push`-style edits.

### Environment variables

`src/lib/env.ts` zod-validates **only** the core set (DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, STORAGE_MODE + S3, UPSTASH_REDIS_URL, CNIC_HASH_SALT, NODE_ENV). **Not validated but used in code:** `RECOMMENDATION_CRON_SECRET`, `RECOMMENDATION_BATCH_SIZE`, `INVITE_TO_APPLY_DAILY_CAP_PER_COMPANY`, `INVITE_TO_APPLY_MONTHLY_CAP_PER_CANDIDATE`, `SEARCH_DRIVER`, `SEARCH_AUTOSUGGEST_CACHE_TTL_SECONDS`, `GOOGLE_CLIENT_ID/SECRET`, `EMAIL_SERVER`, `EMAIL_FROM`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

### Dependencies (`pnpm audit --prod`)

| Package | Severity | Vuln | Patched in | Note |
|---|---|---|---|---|
| nodemailer | moderate | SMTP command injection | ≥8.0.5 | Direct dep — bump recommended |
| postcss | moderate | XSS via unescaped `</style>` | ≥8.5.10 | Transitive via `next` |
| @hono/node-server | moderate | middleware bypass | ≥1.19.13 | Transitive |
| nodemailer | low | SMTP injection (`envelope.size`) | ≥8.0.4 | Same dep |

Next.js pinned at **16.2.6** (exact — good); no Next-specific advisory in this audit. React 19.2.4 / Prisma 7.8.0 exact-pinned. Several deps use `^` (zod, next-intl, ioredis, sharp, @auth/prisma-adapter) — recommend pinning infra libs.

### route-map

Generated at `scripts/audit/route-map.json` (104 routes, 98 call sites, 25 candidate-orphans — classified in Domain D below).

---

## Findings

> Severity: **CRITICAL** = exploitable hole / PII exposure / broken authz / build fails / data loss · **HIGH** = broken core flow / missing authz / injection / perf-at-load / SEO blocker · **MEDIUM** = degraded UX / minor logic bug / structural drift / SEO enhancement · **LOW** = polish / dead code.

### A. Build & Compile

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| A1 | CRITICAL | `src/components/shared/ListingCard.tsx:1` + `src/core/adapters/storage.ts:13,21,27` | `ListingCard` is `"use client"` but imports `getPublicUrl` from the server-only storage adapter, which `import("fs/promises")`. Turbopack tries to bundle `fs/promises` for the browser. | **`pnpm build` fails outright.** No production deploy possible. | Make `ListingCard` a server component (it renders static markup + a `<Link>`), or compute the image URL in the server parent and pass a plain string prop; keep `storage.ts` out of any client import graph. |
| A2 | HIGH | `next.config.ts:9,12` | `typescript.ignoreBuildErrors:true` + `eslint.ignoreDuringBuilds:true` mask all TS/lint errors at build time. Added to work around OOM, but now hides real regressions (e.g. the 9 ESLint errors). | Broken code can ship silently. | Re-enable once memory is addressed (or run `tsc`/`eslint` in CI as a hard gate); at minimum document the CI gate that replaces them. |
| A3 | LOW | `next.config.ts:12` | `eslint` key triggers `tsc` error TS2353 (not in `NextConfig` type for this Next version). | 1 spurious typecheck error. | Cast config or move eslint setting; or upgrade `@types`. |
| A4 | MEDIUM | ESLint (8×) e.g. `src/components/ui/XplosaleUI.tsx:428` "Cannot call impure function during render"; multiple "setState synchronously within an effect" in redesigned client components | React correctness violations introduced in the UI redesign (impure `Math.random()` in render; cascading `setState` in effects). | Hydration mismatches, cascading re-renders, unstable SVG ids. | Move random/id generation to `useId`/module scope; guard effect setState. |
| A5 | LOW | `src/middleware.ts` | Next 16 warns "`middleware` convention deprecated, use `proxy`". | Deprecation; future breakage. | Rename per Next 16 guidance when convenient. |

### B. Dependencies

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| B1 | MEDIUM | `package.json` nodemailer | Moderate SMTP-injection CVE (<8.0.5). | Email-send path injectable if attacker controls envelope. | Bump nodemailer ≥8.0.5 (non-major). |
| B2 | LOW | transitive (next→postcss, @hono/node-server) | Moderate CVEs in transitive deps. | Low real exposure. | `pnpm update` / await next patch; document. |
| B3 | LOW | `package.json` | Infra libs (`zod`,`next-intl`,`ioredis`,`sharp`,`@auth/prisma-adapter`) use `^` ranges. | Non-reproducible installs. | Pin exact versions. |

*(Do not auto-bump majors — none recommended automatically.)*

### C. Security — items confirmed directly (agent deep-dive appended below)

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| C1 | HIGH | `.env` (tracked in git); `.gitignore:38-39` deliberately keeps it | `.env` is committed and contains a **real 44-char `NEXTAUTH_SECRET`** and **real 44-char `CNIC_HASH_SALT`** (not placeholders). Infra URLs appear to be local-docker defaults. | Anyone with repo access can forge session JWTs (NEXTAUTH_SECRET) and, with a DB leak, brute-force 13-digit CNICs (salt known → defeats the hash). | Remove `.env` from git, rotate **both** secrets, move real secrets to deploy-time env only. Keep only a placeholder `.env.example`. |
| C2 | MEDIUM | `next.config.ts:headers()` | Security headers present (nosniff, X-Frame-Options DENY, XSS, Referrer-Policy, HSTS-prod) but **no `Content-Security-Policy`**. | XSS blast radius larger than necessary. | Add a baseline CSP. |
| C3 | MEDIUM | `src/app/api/upload/serve/route.ts:30-35` | Private-bucket serve checks only that **a** session exists, not that the requester is authorized for **that file**. Mitigated by short-TTL HMAC tokens, but any logged-in user with a (leaked/guessed) signed URL can fetch another user's private object. | Potential IDOR on CNIC/selfie/resume in local mode. | Bind the token to the viewer's userId, or check resource ownership before serving. |
| C4 | MEDIUM | `src/lib/env.ts` | `RECOMMENDATION_CRON_SECRET` not in the validated env schema. If unset in prod, cron auth compares against `undefined`. | Header `!== undefined` still 403s (safe by luck), but the secret's existence isn't guaranteed. | Add cron secret + other used vars to `env.ts`; fail fast if missing. |

*(Full Security domain table — admin authz, IDOR sweep, discovery privacy, injection, OTP, rate limits, XSS, SSRF — appended from the security agent below.)*

