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

**Security deep-dive (verified by dedicated read-only sweep). Verdict: no CRITICAL security holes; backend authz is largely solid.**

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| C5 | MEDIUM | `src/app/api/network/people/route.ts:9-50` | Candidate discovery directory filters `openToWork` + network `visibility:"PUBLIC"` but **never checks `recruiterDiscoverable === true`**, and has **no session/auth gate** (fully public). | Candidates who did not opt into recruiter discovery (default `false`) are still listed to anyone, incl. unauthenticated. Phase 28 privacy-control bypass. Payload exposes only name/handle/headline/photo/location/salary — no phone/CNIC/email. | Add `jobSeekerProfile:{ recruiterDiscoverable:true, openToWork:true }` to the `where`; require a session. |
| C6 | MEDIUM | `src/lib/rate-limit.ts` (sole caller `src/core/auth/otp.ts`) | `rateLimit()` enforced **only** on OTP send. Message send (`chat/rooms/[roomId]/messages/route.ts:55`), room creation (`chat/rooms/route.ts:14`), listing creation (`listings/route.ts:108`), offers (`listings/[listingId]/offer/route.ts`) have no rate limit. | Spam/abuse: unbounded messages, rooms, listings, offers per authenticated user. (Invites have DB-count business caps but no request-rate throttle.) | Apply `rateLimit()` to message send, room/listing creation, and offers. |

**Verified safe:** all 12 `/api/admin/**` routes role-gate server-side (+ last-admin/self-demotion guard); ATS routes (`applications`, `notes`, `assignments`, `match`, `jobs/[jobId]/applications`) gate via `canAccessJobApplications`; assignment `start/submit/autosave` require candidate ownership; chat verifies participant; test `correctIds` stripped for candidates (`assignments/[assignmentId]/route.ts:52-62`); no route trusts a client-supplied acting userId; search injection-safe (`websearch_to_tsquery` + `Prisma.sql` value interpolation, NUL stripped, no identifier concat); OTP hardened (5-min TTL, atomic single-use + 5-attempt lockout via Lua, HMAC-hashed, per-phone 3/hr + per-IP 5/hr); no open-redirect/SSRF (only hardcoded Resend fetch); presigned tokens HMAC-SHA256 + `timingSafeEqual` + path-traversal containment; the 2 `dangerouslySetInnerHTML` (`(marketing)/page.tsx:448,452`) render only static literals.

### D. Frontend ↔ Backend Contract

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| D1 | HIGH | `src/components/shared/InviteButton.tsx` (0 render sites) | `InviteButton` is never imported/mounted; it's the only caller of `POST /api/invites`. The entire **Invite-to-Apply send flow is unwired**. | Recruiters cannot send invites from the UI despite a complete backend (caps, dedup, do-not-contact). | Mount `InviteButton` on candidate cards in network/people and ATS candidate views. |
| D2 | HIGH | `src/components/shared/SaveSearchButton.tsx` (0 render sites) | `SaveSearchButton` never rendered. `POST /api/search/saved` works but no UI creates saved searches. `/me/saved-searches` can only edit/delete. | Users can never create a search alert; the search-digest cron has nothing to send. | Render `SaveSearchButton` on search/browse pages. |
| D3 | MEDIUM | `src/app/search/page.tsx`, `(jobs)/jobs/page.tsx:56`, `(marketplace)/m/page.tsx:75`, `(network)/n/people/page.tsx:24`, `n/feed/page.tsx:52` | Browse/search pages query Prisma directly and never call the Phase-25 search API (`/api/search/{jobs,companies,marketplace,network,universal,suggest,click}`, `/api/network/{feed,people}`) — **9 routes genuinely dead**; full-text ranking + click analytics built but unreachable; logic duplicated in-page. | Dead code; two divergent query paths; no ranked search / analytics. | Wire pages to the search API (preferred) **or** delete the unused routes + search client. |
| D4 | LOW | `src/components/shared/LanguageSwitcher.tsx:18-22` | Only writes a `NEXT_LOCALE` cookie; never calls `PATCH /api/account/language`. | Locale not persisted per-user/server-side; resets across devices. | Call the route on change, or delete it if cookie-only is intended. |
| D5 | LOW | `InviteButton.tsx:31` vs `api/invites/route.ts:8-12` | Body sends `companyId`; route schema omits it (derives from employer profile). Non-strict zod ignores it. | Harmless contract drift. | Drop `companyId` from body. |
| D6 | LOW | `(account)/me/saved-searches/SavedSearchesClient.tsx:31,43` | `updateFrequency`/`deleteSearch` don't check `res.ok`; optimistically mutate local state even on failure. | Silent data loss on network error. | Check `res.ok`; revert on failure. |

**Orphan classification (25 candidates):** **dead (a):** 9 search/network routes above + `/api/account/applications` + `/api/account/language` + `/api/ats/match`. **legitimate (b):** `[...nextauth]`, 3 crons, `healthcheck`, `chat/sse` (EventSource), `upload/image`, `upload/serve`, `upload/serve-public`, `companies/[companyId]`, `admin/audit`, `network/profiles/[handle]` + `/endorse`. **bug — should be wired (c):** `/api/invites` (D1), `/api/search/saved` (D2).

### E. Logic Correctness

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| E1 | CRITICAL | `prisma/schema.prisma:402-416` (`EscrowTransaction`); **0 mutation sites in `src/`** | The Escrow state machine (HELD→RELEASED/REFUNDED/DISPUTED) is **entirely unimplemented**. No create/update of `escrowTransaction` anywhere. The marketplace "offer" flow just posts a chat message of `kind:"OFFER"` — no escrow record, holds, or release/refund. | The advertised "escrow-protected" feature **does not exist server-side**. Marketing claim + UI badges are unbacked. | Implement escrow create-on-accept with guarded RELEASE/REFUND/DISPUTE transitions, **or** remove the model + escrow claims. (Product decision needed.) |
| E2 | HIGH | `src/app/api/jobs/[jobId]/applications/[applicationId]/route.ts:43-49` | Phase-16 legacy-mirror divergence: this employer PATCH writes `status` only, never `currentStageId`. The Kanban `move` route writes both. | Status and pipeline stage diverge; candidate shows in old column while status says HIRED/REJECTED. | Map status→stage and write both, or deprecate this endpoint in favor of `/move`. |
| E3 | MEDIUM | `src/app/api/jobs/[jobId]/apply/route.ts:69-72` | Re-apply `upsert.update` sets `status:"APPLIED"` but doesn't reset `currentStageId` to initial stage. | Re-applicant is APPLIED yet stuck on an old/rejected stage. | Set `currentStageId: initialStage?.id` in the update branch. |
| E4 | MEDIUM | `src/app/api/admin/listings/[listingId]/approve/route.ts:18-26`; reject; PATCH `listings/[listingId]/route.ts:83-87` | Non-admin transitions are guarded (DRAFT→PENDING_REVIEW only), but **admin approve/reject/PATCH accept any current status** — a SOLD/EXPIRED listing can be flipped back to ACTIVE. | Admin can resurrect terminal-state listings; no transition table. | Guard approve to act only on `PENDING_REVIEW`; restrict admin status moves to a valid-transition table. |
| E5 | MEDIUM | `src/app/api/account/recommendations/route.ts:26-53` | Recommendations list uses OFFSET pagination ordered by `score desc` only (no tie-breaker). Many recs share identical scores. | Unstable page boundaries → rows skipped/duplicated across pages. | Add secondary sort `{score:desc},{id:asc}`; prefer keyset on `(score,id)`. |
| E6 | LOW | `src/core/search/postgres.ts:52,137-166` | Search uses `LIMIT/OFFSET` with an offset-encoded cursor (not true keyset). (Routes currently unwired — D3.) | Pagination drift/perf on large tables if ever wired. | Convert to keyset on `(rank,createdAt,id)` when wired. |
| E7 | LOW | `invites/[inviteId]/route.ts:31`; `ats/assignments/[assignmentId]/start:36`, `submit:45` | State guards are read-then-write (non-atomic); concurrent PATCHes can both pass. | Rare double-processing (e.g. accept+decline race). | Use conditional `updateMany({where:{id,status:"PENDING"}})` + check `count`. |
| E8 | LOW | `cron/expire-invites:8`; `cron/job-recommendations:9` | Both crons share `RECOMMENDATION_CRON_SECRET`. | One leaked secret exposes both. | Distinct per-cron secrets or a documented shared `CRON_SECRET`. |

**Verified correct:** invite state machine + caps/dedup + single notification; job-rec notification dedup (`notified`/`sentAt`, only score≥0.5) and keyset-on-`id` cron pagination; invite auto-expiry (cron + on-read); assignment state machine (idempotent start, order-independent MCQ grade, transactional); ATS `move` dual-write (atomic, company-validated); listing non-admin transition guard; recommendation scoring (weights 0.4/0.3/0.2/0.1, capped, deterministic, no div-by-zero); match-score (empty list→1.0, weights 0.70/0.20/0.10, clamped 0–100).

### F. Structure

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| F1 | MEDIUM | `src/core/adapters/storage.ts` (no `import "server-only"`) | Server-only adapter (fs/promises, node:crypto, @aws-sdk) lacks a `server-only` guard, so nothing prevents client import — exactly what broke the build (A1). | Recurring client/server boundary leaks. | Add `import "server-only";` at top of `storage.ts` (and other server adapters) to fail fast at import time. |
| F2 | MEDIUM | search pages vs `src/core/search/*` | Phase-25 search engine duplicated by direct Prisma queries in pages (see D3) — `core/search` bypassed. | Two query implementations; vertical logic in pages. | Consolidate on `core/search` or remove it. |
| F3 | LOW | general | Adapter pattern otherwise respected (storage/email/kv/realtime under `core/adapters`); `lib/http.ts` error shaping consistent; 1 `"use server"`, 48 `"use client"` (a few client components render static content — minor). | Minor drift. | Convert static client components to server where trivial. |

### G. Performance

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| G1 | HIGH | `src/app/api/cron/job-recommendations/route.ts:29-101` | Per-profile N+1: inside `for(profile)` → `application.findMany`, `jobPosting.findMany`, then inside `for(scored)` → `findUnique` + `update`/`create` + `notification.create` + `update` **per job**. BATCH_SIZE 200 × many jobs = thousands of sequential round-trips. | Cron times out / hammers DB at scale. | Batch existing recs with one `findMany({jobPostingId:{in}})`; use `createMany`/transaction; batch notifications. |
| G2 | HIGH | `cron/job-recommendations/route.ts:53-56` | `jobPosting.findMany` has **no `take`** — loads all active jobs into memory **for every profile**, scored in JS. | Unbounded memory + repeated full scans. | Add `take`; fetch active-jobs set **once** per cron run (same query reused per profile); pre-filter in SQL. |
| G3 | MEDIUM | `cron/job-recommendations/route.ts:24` | `include:{user:true}` loads full User rows (phone/email/cnHash) though the engine never uses them. | Over-fetches sensitive columns into cron memory. | Replace with `select` of needed fields, or drop. |
| G4 | MEDIUM | `api/regions:6`, `(jobs)/jobs/page.tsx:52`, `network/connections:23`, `account/applications:14`, several `ats/*`, `admin/verifications:11`, `admin/partners:11` | `findMany` without `take` on user-growth-driven lists (applications, connections, verifications, partners). | Response/memory degrade as data grows. | Add pagination/`take` caps. |
| G5 | MEDIUM | `src/components/shared/ListingCard.tsx` + `storage.ts` | (= A1) Client component pulls server-only Node modules into the browser bundle. | Build break / bundle bloat. | See A1/F1. |
| G6 | LOW | `verticals/jobs/recommendations/engine.ts:36-106` | Scores entire unbounded `jobs` array in JS per profile (compounds G2). | CPU scales jobs×profiles. | Pre-filter candidates in SQL; cap input. |
| G7 | LOW | `jobs/[jobId]/page.tsx:141` | `similarJobs` fetched sequentially after the parallel block. | Minor extra round-trip. | Fold into the initial `Promise.all`. |

**Verified good:** `suggest()` caches in Upstash (TTL `SEARCH_AUTOSUGGEST_CACHE_TTL_SECONDS`/300s); hot list paths use `Promise.all`; search GIN indexes present in `search_infra.sql`.

### H. SEO

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| H1 | HIGH | only `layout.tsx:17-20` | No `generateMetadata` anywhere; all list + detail pages inherit one generic title/description. | Every listing/job/profile/company shares one title; poor snippets, ranking/CTR loss. | Add `generateMetadata` per detail page (listing title+price; `${job} at ${company}`; profile name+headline; company name). |
| H2 | HIGH | absent | No `app/sitemap.ts`. | Crawlers can't discover active listings/jobs/profiles/companies. | Add `sitemap.ts` enumerating ACTIVE listings/jobs, PUBLIC profiles, companies; exclude /me,/admin,/chat. |
| H3 | HIGH | absent | No `app/robots.ts`. | No crawl guidance; private areas crawlable; no sitemap pointer. | Add `robots.ts` (disallow /me,/admin,/chat,/api; reference sitemap). |
| H4 | HIGH | absent (grep: 0 `ld+json`) | No JSON-LD structured data. | No Google-for-Jobs eligibility (JobPosting), no Product/Offer, Person/ProfilePage, Organization, BreadcrumbList rich results. | Inject JSON-LD per detail page. |
| H5 | HIGH | absent (grep: 0 `openGraph`/`twitter`) | No OG/Twitter cards on shareable surfaces. | Shared links render with no image/title; poor social CTR. | Add `openGraph`/`twitter` in each detail `generateMetadata`. |
| H6 | MEDIUM | list pages `m/page.tsx:38`, `jobs/page.tsx:25` | No canonical URLs; filter/sort/page params produce duplicate-content URLs. | Duplicate permutations indexed, diluting ranking. | Set `alternates.canonical`; canonicalize filtered lists to base path. |
| H7 | MEDIUM | `layout.tsx:53-54` | `lang`/`dir` correct per locale, but no `hreflang` alternates for en/ur. | Multilingual variants not linked; wrong-locale results. | Add `alternates.languages` (hreflang). |
| H8 | MEDIUM | absent | No `robots:{index:false}` on /me,/admin,/chat (session-gated, low exposure). | No defense-in-depth if a private URL leaks. | Add noindex metadata to those layouts. |
| H9 | — (pass) | detail pages | All four detail pages are server components (indexable content SSR'd); single `h1` per page. | Correct. | None. |

### I. Functionality & UX

| ID | Sev | Location | Finding | Impact | Fix |
|---|---|---|---|---|---|
| I1 | MEDIUM | `(network)/n/[handle]/page.tsx:121,129`; `(jobs)/companies/[companyId]/page.tsx:37` | Profile banner/photo + company logo use raw `<img>` not `next/image`. | No optimization/lazy sizing; layout shift; larger payloads. | Use `next/image` with width/height. |
| I2 | MEDIUM | absent | No `app/not-found.tsx` / `app/error.tsx`; many pages call `notFound()`. | Missing/errored pages render default unstyled Next screens; no error recovery. | Add custom `not-found.tsx` + `error.tsx`. |
| I3 | MEDIUM | `(jobs)/jobs/page.tsx:138` (`left:12` inline); `n/[handle]` `pl-4` :181,202 | RTL: physical props (`left`, `pl-4`) won't mirror; Urdu search icon overlaps text, accents don't flip. | Broken RTL layout in Urdu. | Use logical props: `insetInlineStart`, Tailwind `ps-4`. |
| I4 | LOW | `(jobs)/jobs/page.tsx:233-249` | Job-type chips are non-interactive `<span>` with `cursor:pointer` but no handler. | Misleading affordance — clicking does nothing. | Make them real filters or remove the pointer affordance. |

**Verified good:** forms disable-while-pending + surface errors (Apply/Offer/Connect buttons); list empty states present; PWA manifest valid + service worker registers/precaches (minor: manifest `theme_color` #1a1a2e ≠ meta theme-color #F4F2EC — cosmetic).

---

## Executive Summary

**Health verdict:** *Backend logic and security are largely sound and well-built — but the platform is **not deployable as-is**: the production build fails, a clean DB deploy would be missing 23 tables, a core advertised feature (escrow) is unimplemented, and three recently-built features are wired only on the backend.*

### Findings by severity

| Severity | Count | IDs |
|---|---|---|
| **CRITICAL** | 4 | A1 (build fails), Migration drift (23 models), C1 (real secrets committed), E1 (escrow unimplemented) |
| **HIGH** | 11 | A2, E2, D1, D2, G1, G2, H1, H2, H3, H4, H5 |
| **MEDIUM** | 19 | A4, B1, C2, C3, C4, C5, C6, D3, E3, E4, E5, F1, F2, G3, G4, H6, H7, H8, I1, I2, I3 |
| **LOW** | 14 | A3, A5, B2, B3, D4, D5, D6, E6, E7, E8, F3, G6, G7, I4 |

### Top 5 risks

1. **Build is broken (A1)** — `ListingCard` (client) imports the server-only storage adapter → `pnpm build` fails. No deploy possible until fixed.
2. **Migration drift** — only the Phase-1–15 init migration exists; 23 Phase-16+ models + the tsvector setup have no Prisma migration. A clean `migrate deploy` yields a broken DB.
3. **Escrow is fiction (E1)** — the "escrow-protected" feature has zero server implementation; offers are just chat messages. Either build it or drop the claim.
4. **Real secrets in git (C1)** — committed `NEXTAUTH_SECRET` (session forgery) + `CNIC_HASH_SALT` (defeats CNIC hashing). Rotate both, untrack `.env`.
5. **Flagship features unreachable (D1/D2/D3)** — Invite-to-Apply send, Saved-search creation, and the entire Phase-25 search engine are built on the backend but never wired into the UI.

### Prioritized remediation plan

**Batch 1 — CRITICAL build + deploy (branch `fix/build`)**
A1 (move URL build server-side / `server-only` guard F1) → restore `pnpm build`; re-enable or CI-gate A2; A3. Then resolve migration drift: generate proper Prisma migrations for the 23 models + fold `search_infra.sql` into a tracked migration (additive, reversible — call out before applying).

**Batch 2 — CRITICAL security + data integrity (branch `fix/security`)**
C1 (untrack `.env`, rotate secrets) → E1 (escrow: implement or formally remove + de-claim) → C5 (discovery privacy filter) → C2/C3/C4/C6 (CSP, per-file authz, env validation incl. cron secret, rate limits).

**Batch 3 — HIGH broken flows (branch `fix/wiring`)**
D1/D2 (mount InviteButton + SaveSearchButton) → D3 (wire or delete search API) → E2/E3 (legacy-mirror dual-write) → G1/G2 (recommendations cron N+1 + unbounded query).

**Batch 4 — HIGH SEO (branch `fix/seo`)**
H1–H5 (generateMetadata, sitemap, robots, JSON-LD, OG/Twitter).

**Batch 5 — MEDIUM (branch `fix/medium`)**
E4/E5, G3/G4, H6/H7/H8, I1/I2/I3, C-residuals, B1 dep bump.

**Batch 6 — LOW (branch `fix/polish`)**
Remaining LOW items, dead-code removal, A5 middleware rename.

### Quick wins (high value, low effort)

- **A1 / F1** — add `import "server-only"` to `storage.ts` + pass image URL as a prop from the server parent. *Unblocks the entire build.*
- **C1** — `git rm --cached .env`, rotate the two secrets. Minutes; closes a CRITICAL.
- **C5** — add `recruiterDiscoverable:true` to the people-directory `where`. One line; closes the privacy bug.
- **H2/H3** — add `app/sitemap.ts` + `app/robots.ts`. Two small files; large SEO gain.
- **I2** — add `app/not-found.tsx` + `app/error.tsx`. Removes soft-404s/unstyled crashes.
- **D5/D6/I4** — drop stray `companyId`, add `res.ok` checks, fix dead chips. Trivial.

---

**Pass 1 complete. No application code was changed. Awaiting your review and priority order before starting Pass 2.**

