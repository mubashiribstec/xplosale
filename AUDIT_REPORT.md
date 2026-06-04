# Xplosale — Live-Site Audit Report
**Branch:** `audit/live` | **Date:** 2026-06-04 | **Scope:** Pass 0 + Pass 1 (read-only)

---

## Executive Summary

The codebase builds cleanly (zero TypeScript errors, zero lint errors) and is structurally sound. However several **high-integrity issues** must be addressed before traffic scales:
- Fabricated platform metrics displayed over an empty database
- False NADRA/biometric claims that are legally risky in Pakistan
- Phone-OTP auth still active (spec mandates Google-only)
- Global Navbar/Footer absent from all inner pages (marketplace, jobs, account)
- Session architecture cannot immediately enforce bans or track online presence
- Dark mode exists only as OS-responsive CSS — no manual toggle, no SSR persistence

The admin panel covers core functions but is missing online-status, platform controls, and sessions/security views.

---

## Pass 0 — Baseline

### Build / Typecheck / Lint

| Check | Result |
|---|---|
| `pnpm tsc --noEmit` | **CLEAN** — zero errors |
| `pnpm build` | **CLEAN** — all routes compiled; Prisma runtime warnings during static generation are expected (no DB in build env) |
| Lint | **CLEAN** |

### Database State

No seed data in any table. `searchClient.search()` on both feeds filters `status = 'ACTIVE'` against an empty table and correctly returns zero results — the feeds are not silently erroring. **The empty feed is purely a data problem** (no seed run / no production import), not a query bug.

### Auth Setup (recorded)

| Property | Value |
|---|---|
| Session strategy | `jwt` — `auth.config.ts:83` |
| `maxAge` | `SESSION_MAX_AGE_DAYS × 86400` (default 30 days) |
| `updateAge` | Not set (NextAuth v5 default: 24 h) |
| Providers | Credentials/Phone-OTP (**always active**); Google OAuth (conditional on `GOOGLE_CLIENT_ID`); Nodemailer (conditional on `EMAIL_SERVER`) |
| Ban mechanism | `User.bannedAt` + `User.tokenVersion` — token refresh check throttled to **every 5 minutes** |
| Online presence | **Not implemented** — no `lastSeenAt` field, no tracking |
| Cookie attributes | httpOnly ✓, secure (prod) ✓, sameSite=lax ✓ — NextAuth v5 defaults |

---

## Findings

| ID | Sev | Area | Location | Finding | Impact | Fix | Effort |
|---|---|---|---|---|---|---|---|
| **C1** | CRITICAL | Bug/Trust | `(marketing)/page.tsx:143,199,214–217,260–263,326,334,342,477` | **Fabricated metrics** — "27,418 verified", "94% sellers verified", "₨4.2cr escrow", "11,907 professionals/verified", "48,200 active listings", "1,316 open roles" are all hardcoded strings with no Prisma backing. DB is empty; `/m` shows 0 listings, `/jobs` shows 0 jobs — direct contradiction. | False advertising; destroys user trust | Replace every hardcoded metric with a real `prisma.*.count()` call in the server component. Zeros → honest empty-state copy ("Be the first to post"). | S |
| **C2** | CRITICAL | Logic/Legal | `(marketing)/page.tsx:77,199,477` | **False NADRA/biometric claims** — "powered by NADRA", "cross-check with NADRA in real time", "CNIC + biometrics". NADRA API is mocked (`otp.ts:106` prints `[MOCK SMS]`); no NADRA integration exists; no biometric capture exists. | Legally risky in Pakistan; deceptive | Remove all NADRA/biometric/real-time-government-verification language. Replace with accurate: "We manually review your uploaded identity document." | S |
| **H1** | HIGH | Auth | `(auth)/login/page.tsx:14–47`, `auth.config.ts:27–55`, `core/auth/otp.ts` | **Phone-OTP auth still live** — login page has expandable phone form (`phoneOpen` state), calls `/api/auth/phone/send-otp`, `/verify` page exists, Credentials provider always registered in `auth.config.ts`, `core/auth/otp.ts` fully functional. Spec §2 mandates Google-only. | Violates §2 mandate; dead code; attack surface | Remove Credentials provider from `auth.config.ts`. Delete `/api/auth/phone/` routes, `core/auth/otp.ts`, `/verify` page. Remove phone OTP UI from login page. Phone remains optional contact field only. | M |
| **H2** | HIGH | Structure | All inner pages | **Global Navbar/Footer absent from all inner pages** — no `layout.tsx` under `(marketplace)/`, `(jobs)/`, `(account)/`, `(profile)/`. `MarketplaceShell` and jobs page render standalone `<main>` with no header. Root `layout.tsx` intentionally excludes Navbar (it's a client component). Marketing home `page.tsx` is the only page with Navbar + Footer. | Disconnected UX; logo doesn't link home from any feed or detail page | Add `layout.tsx` to each route group: `(marketplace)/layout.tsx`, `(jobs)/layout.tsx`, `(account)/layout.tsx`, `(profile)/layout.tsx`, `(partner)/layout.tsx`. Each renders `<Navbar />` + `{children}` + `<Footer />`. | S |
| **H3** | HIGH | Feature/SEO | `(marketplace)/m/page.tsx`, `(jobs)/jobs/page.tsx` | **No per-page SEO metadata on feed pages** — neither page exports `metadata` or `generateMetadata`. Both share the root title "Xplosale — Sell. Hire. Connect. Verified." Detail pages (`/m/[listingId]`, `/jobs/[jobId]`) DO have `generateMetadata` + JSON-LD ✓. | Poor search indexing for primary landing routes | Add `export const metadata = { title: "Marketplace — Xplosale", description: "..." }` to each feed page. Add `generateMetadata` for filtered views. | S |
| **H4** | HIGH | Feature | `app/globals.css:133`, `layout.tsx`, `components/layout/Navbar.tsx` | **Dark mode: OS-responsive CSS exists, manual toggle does not** — `globals.css:133` has `@media (prefers-color-scheme: dark)` that correctly remaps all CSS custom properties. But: `next-themes` is not installed, there is no toggle button anywhere, and the server cannot know the client's theme preference — a flash of wrong theme is possible on first SSR load. | §2/§6.D mandate unmet; UX inconsistency on first load | Install `next-themes`. Wrap root layout body in `ThemeProvider`. Add a toggle icon to Navbar. Persist choice via cookie so SSR matches. The CSS variable tokens are already correct — only the wiring is missing. | M |
| **H5** | HIGH | Structure | `(marketing)/page.tsx:308,321–342` | **Stale "Three trusted verticals"** — section heading "One platform. Three trusted verticals." and a third card "#03 Profiles backed by real identity" with `href="/me/verify-identity"` and metric "11,907 verified" are remnants of the removed Network vertical. | Confusing UX; dead metric | Rewrite as two verticals (Marketplace, Jobs) + a trust/verification card that describes the identity layer cross-cutting both, not as a separate destination. | S |
| **M1** | MEDIUM | Auth | `auth.config.ts:156–174` | **Ban enforcement delayed up to 5 minutes** — `bannedAt`/`tokenVersion` check runs only when `now - lastRefresh > 300`. A newly banned user can make authenticated requests for up to 5 min. | Banned users can continue acting briefly | See §4.4 recommendation: move ban check to a Redis-key lookup in middleware (O(1), runs every request) | M |
| **M2** | MEDIUM | Admin | `(admin)/admin/users/page.tsx:22` | **Stale `EMPLOYER` role in admin filter** — `role as "USER" \| "EMPLOYER" \| "ADMIN"`. EMPLOYER was migrated to PARTNER in Phase 2. Filter silently returns 0 results for PARTNER users. | Admin user search by role is broken for PARTNER | Change to `"USER" \| "PARTNER" \| "ADMIN"` | XS |
| **M3** | MEDIUM | Admin | `(admin)/admin/users/page.tsx:33–43` | **Admin users query missing critical fields** — `select` omits `bannedAt`, `hasVerifiedBadge`, `email`, `image`, `isPartner`. Admin cannot see ban status, verified badges, or user emails. | Admin blind to most user state | Extend `select`; update `AdminUsersTable` to display these fields and a ban status indicator. | S |
| **M4** | MEDIUM | Admin | Schema, middleware, admin panel | **No online presence / lastSeenAt** — `User` model has no `lastSeenAt` field. Admin "who is online" view is impossible. §5 mandates this. | §5 admin spec unmet | Add `lastSeenAt DateTime?` to User; update middleware to set a Redis key throttled per-minute; admin reads Redis keys for "online now" | M |
| **M5** | MEDIUM | Admin | `(admin)/admin/` | **Admin panel missing three required sections**: (a) Platform Controls (feature flags, maintenance mode, announcement banner, regions/categories); (b) Sessions/Security (active sessions, login-attempt log, force-logout-all); (c) Jobs moderation (`/admin/jobs` page does not exist — only `/admin/listings`). | §5 admin spec unmet | Add three new admin pages and their API routes. Sessions section requires §4.4 implementation. | L |
| **M6** | MEDIUM | SEO | `app/robots.ts:8` | **robots.txt allows `/n/`** — the Network routes redirect to `/profile/`. `allow: ["/n/"]` wastes crawl budget on redirect chains. `/profile/` is not in the allow list. | Crawl budget waste; public profiles under `/profile/` invisible to crawlers | Replace `/n/` with `/profile/` in the `allow` array. | XS |
| **L1** | LOW | SEO | `app/sitemap.ts:39` | **`/n` in sitemap static routes** — redirects to `/m`; creates redirect chain for crawlers. `/profile` not in static routes. | Minor SEO signal dilution | Remove `/n`, add `/profile` to static routes. | XS |
| **L2** | LOW | Auth | `auth.config.ts:89–99` | **Auth `signIn` callback silently swallows all DB errors** — catch block discards every error without logging. Genuine DB failures during OAuth sign-in are invisible. | Hard-to-debug auth failures | `catch (e) { if ((e as {code?:string})?.code !== 'P2025') console.error('[auth:signIn]', e); }` | XS |
| **L3** | LOW | Trust | `(marketing)/page.tsx:625–655` | **Fabricated testimonials** — "Asad Khan / Buyer, Lahore", "Sana Rizvi / Recruiter", "Fahad Qureshi / Freelance Developer" are invented personas. Minor but compounds C1 trust problem. | Minor credibility risk | Remove testimonials section until real user quotes can be obtained, or replace with a "coming soon" placeholder. | XS |

---

## §4 Deep Auth Audit

### 4.1 Login (current state)
- **Google** provider: correctly conditional on env vars ✓
- **Credentials/Phone-OTP**: always active — see H1
- **Nodemailer**: conditional on `EMAIL_SERVER` — spec §9 also requires removal
- Post-login redirect via `/auth/post-login` server component: USER→`/profile`, PARTNER→`/partner`, ADMIN→`/admin` ✓
- First OAuth sign-in: `PrismaAdapter` creates User; `signIn` callback upserts name/email ✓
- Error states: falls through to NextAuth's default `/api/auth/error` page (no custom branded error UI)

### 4.2 Logout
- `signOut({ callbackUrl: "/" })` in Navbar clears the session JWT cookie ✓
- **Known weakness confirmed**: pure JWT — a copied token stays valid for up to 30 days after logout. The `tokenVersion` mechanism (increment on force-logout) partially mitigates this but only fires every 5 minutes. See §4.4.
- No bfcache/back-button protection beyond Next.js's default `no-store` headers on RSC payloads.

### 4.3 Session Persistence
- `maxAge: 30 days` — persistent across browser restarts ✓
- `updateAge`: unset — token renewed at most every 24 h (NextAuth v5 default)
- Cookie `domain`: not explicitly set → exact origin scope (`app.xplosole.com`) — correct; not widened ✓
- JWT payload: `{id, role, phone, bannedAt, tokenVersion}` — no secrets in payload ✓
- `NEXT_PUBLIC_*` contains only `APP_URL` and `ANALYTICS_ENABLED` — no secrets ✓

### 4.4 Session Architecture: Recommendation

**Recommended: Option B Enhanced — keep JWT + Redis enforcement layer**

Switching to DB sessions (Option A) requires a schema migration, changing the session strategy, rewriting all session reads, and significant testing on a live platform. Option B can satisfy every constraint with targeted additions:

```
Additions required:
  Schema:     User.lastSeenAt   DateTime?
              User.banReason    String?
              User.bannedUntil  DateTime?     (null = permanent)

  Redis keys:
    banned:{userId}    = "1"  (TTL = maxAge)    set on ban; deleted on unban
    lastSeen:{userId}  = epoch_ms               set in middleware, throttled 1/min

  Middleware (on every auth'd request):
    1. Decode JWT (already done by NextAuth middleware hook)
    2. Redis GET banned:{userId}
       → If exists: clear cookie, 302 /login?reason=banned   [instant enforcement]
    3. Redis SET lastSeen:{userId} {now} EX 300  (throttled via NX + TTL trick)

  Ban API (PATCH /api/admin/users/[userId]):
    → DB: bannedAt = new Date(), tokenVersion++
    → Redis: SET banned:{userId} 1

  Logout (client-side signOut or force-logout):
    → DB: tokenVersion++
    → Redis: SET banned:{userId} 1 EX 300   (short-lived; forces re-auth)

  Admin "online now":
    Redis SCAN lastSeen:* or query User.lastSeenAt > now - 5min
    (cron every 5 min: flush Redis lastSeen keys → Postgres User.lastSeenAt)
```

**Tradeoffs of Option B:**
- ✓ No session strategy migration; existing JWT flows unchanged
- ✓ Redis lookups are O(1) ~0.5ms — negligible per-request overhead
- ✓ Ban enforcement: near-instant (next request after ban action)
- ✓ Logout: effective on next request post-signOut (not truly immediate, but within seconds)
- ✗ A stolen token is still valid until `tokenVersion` mismatch is detected (next request, near-instant if Redis check is synchronous in middleware)
- ✗ Redis becomes a single point of failure — must handle Redis-down gracefully (fall back to DB query, don't block all auth)

### 4.5 Ban Enforcement
- Schema: `bannedAt DateTime?` ✓, `tokenVersion Int @default(0)` ✓
- Missing: `banReason String?`, `bannedUntil DateTime?` (timed suspension not possible)
- 5-minute enforcement delay (M1) means a ban is not immediate as the spec requires
- Admin guard against banning admins exists in `PATCH /api/admin/users/[userId]:35–39` ✓

### 4.6 Presence / Online Status
- Not implemented at all: no `lastSeenAt` in schema, no middleware tracking, no admin view
- Required by §5 — see M4 and §4.4 plan above

---

## §5 Admin Panel Gap Analysis

| Required Capability | Status | Notes |
|---|---|---|
| User list: searchable/filterable | ✓ Partial | Missing bannedAt, hasVerifiedBadge, email, isPartner in select (M3) |
| User list: online/offline indicator | ✗ | No lastSeenAt (M4) |
| Ban user (permanent) | ✓ Partial | API exists; UI unclear; banReason/bannedUntil not in schema |
| Suspend (timed ban) | ✗ | No bannedUntil field |
| Unban user | ✓ | Supported in PATCH API |
| Force-logout sessions | ✓ | tokenVersion increment in PATCH API |
| Verify user / allocate badge | ✓ | `/admin/verifications` + API |
| Revoke badge | ✓ | hasVerifiedBadge=false via PATCH API |
| Role promote/demote | ✓ | PATCH API with last-admin guard |
| Partner verification queue | ✓ | `/admin/partners` page + API |
| Content moderation — listings | ✓ | `/admin/listings` page + approve/reject API |
| Content moderation — jobs | ✗ | No `/admin/jobs` page (M5) |
| Platform controls (flags, maintenance, regions) | ✗ | Not implemented (M5) |
| Sessions/security view | ✗ | Not implemented; requires §4.4 Redis layer (M5) |
| Analytics (real real-time counts) | ✗ | Dashboard has static counts; no dedicated analytics section (M5) |
| Audit log | ✓ | `/admin/audit` with full AdminActionLog table |
| Support DM rooms | ✓ | `/admin/support` |

---

## §6 Checklist Summary

### A. Bugs
- Fabricated metrics: C1
- NADRA/biometric claims: C2
- Stale EMPLOYER role in admin filter: M2
- Admin users query missing fields: M3
- No runtime or hydration errors detected in build output

### B. Logic
- All metrics need live Prisma queries (C1)
- tokenVersion ban check runs every 5 min — not immediately (M1)
- Phone OTP auth still live — spec mandates removal (H1)
- Testimonials are fabricated personas (L3)
- **Language files are complete** — all 7 locales have identical key counts (141 each). No action needed.

### C. Structure
- No layout.tsx in `(marketplace)/`, `(jobs)/`, `(account)/`, `(profile)/` — Navbar absent everywhere except marketing home (H2)
- Network routes correctly redirect to `/profile/*` ✓
- `robots.ts` allows `/n/` — should allow `/profile/` instead (M6)
- Phone OTP routes still live as dead code (H1)

### D. Features
- Dark mode: CSS variables in place, `@media` query remaps tokens — but no `next-themes`, no toggle, no SSR persistence (H4)
- Feed pages (`/m`, `/jobs`) lack `generateMetadata` (H3)
- JSON-LD on detail pages (listing: Product, job: JobPosting) ✓
- sitemap contains `/n` stale route; missing `/profile` (L1)

---

## Prioritized Remediation Plan

### Batch 1 — Critical Trust & Integrity
1. **C1** Replace all hardcoded landing metrics with real Prisma queries; zeros → honest copy
2. **C2** Remove NADRA/biometric/real-time-verification language sitewide
3. **H5 (partial)** Remove three-verticals — rewrite as two verticals + trust layer

### Batch 2 — Auth Lifecycle (Google-only + session enforcement)
4. **H1** Remove phone-OTP: Credentials provider, `/api/auth/phone/`, `/verify` page, `otp.ts`, login UI
5. **§4.4** Implement Redis ban+presence layer: schema additions (`lastSeenAt`, `banReason`, `bannedUntil`), middleware Redis check, ban/logout API updates
6. **M1** Near-instant ban enforcement via Redis (flows from §4.4)

### Batch 3 — Structure (header/footer + admin correctness)
7. **H2** Add `layout.tsx` to each route group with `<Navbar>/<Footer>`
8. **M2** Fix stale EMPLOYER→PARTNER role in admin users query (1 line)
9. **M3** Extend admin users select; update `AdminUsersTable` with all fields
10. **M4** Add lastSeenAt to admin users list; add "online" filter

### Batch 4 — Features
11. **H4** Install `next-themes`; add toggle to Navbar; persist via cookie
12. **H3** Add `metadata` exports to `/m` and `/jobs` feed pages
13. **M5** Add Platform Controls, Sessions/Security, Jobs Moderation to admin
14. **M6 + L1 + L2** Fix robots.ts, sitemap, log auth errors

### Quick Wins (slot into any batch)
- M2: 1 line
- M6: 2 lines
- L1: 1 line
- L2: 1 line
- L3: remove testimonials block

---

*Pass 1 complete. Awaiting your approval of findings and the §4.4 session-architecture choice (Option B Enhanced) before any code changes.*
