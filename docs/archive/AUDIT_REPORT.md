# Xplosale Production-Hardening Audit Report

**Date:** 2026-06-05  
**Branch:** `refactor/production-hardening`  
**Audited by:** 6 parallel audit agents covering all major subsystems

---

## Executive Summary

The codebase is in solid shape from the prior security-audit pass. This audit focused on
production-readiness gaps across auth, UI consistency, API correctness, and admin tooling.
All critical findings have been addressed in this branch.

---

## Findings by Severity

### CRITICAL (resolved)

| ID | Finding | File(s) | Status |
|----|---------|---------|--------|
| C1 | Mock verification warnings exposed to users | `verify-identity/page.tsx:94,129` | Fixed |
| C2 | EMPLOYER role written to DB via profile endpoint | `account/profile/employer/route.ts:81` | Fixed |
| C3 | Unbounded cron query — all saved searches loaded at once | `cron/search-digest/route.ts:17` | Fixed (cursor-based batching) |

### HIGH (resolved)

| ID | Finding | File(s) | Status |
|----|---------|---------|--------|
| H1 | EMPLOYER→PARTNER rename incomplete in UI/API | 6 files | Fixed |
| H2 | Unbounded admin queue queries | `admin/verifications/route.ts`, `admin/partners/route.ts` | Fixed (take: 200) |
| H3 | Unbounded user-facing queries | `search/saved`, `account/applications`, `invites/received` | Fixed |

### MEDIUM (resolved)

| ID | Finding | File(s) | Status |
|----|---------|---------|--------|
| M1 | Root layout metadata identical to title (weak SEO) | `app/layout.tsx:36-38` | Fixed |
| M2 | Trust score logic duplicated inline | `me/page.tsx:62-67` | Extracted to `src/lib/tier.ts` |
| M3 | Admin Security and Reports pages missing | admin layout | Created |

### LOW / INFO

| ID | Finding | Status |
|----|---------|--------|
| L1 | next-themes not needed — custom implementation already correct | No action needed |
| L2 | All route group layouts already have Navbar+Footer | No action needed |
| L3 | ThemeToggle already integrated in Navbar | No action needed |
| L4 | Live Prisma counts on marketing page — no fake metrics | No action needed |
| L5 | NADRA/biometric claims removed in prior pass | No action needed |
| L6 | Phone OTP endpoint returns 410 Gone | No action needed |

---

## Subsystem Status

### Authentication
- Google-only OAuth via NextAuth v5 + PrismaAdapter
- JWT 5-minute role/ban refresh with token-version forced logout
- Two-layer ban enforcement: Redis instant + JWT fallback
- No ADMIN_EMAIL env promotion — bootstrap-only admin creation

### Authorization
- src/lib/guard.ts: guardSession, guardAdmin, isAdmin, isPartner, isBanned
- src/lib/tier.ts: getUserTier, computeTrustScore (centralized)
- Middleware protects /admin, /me, /chat, /partner routes
- EMPLOYER legacy role normalized to PARTNER in JWT callback

### API Routes
- All admin endpoints use requireSession + role check
- Upload endpoints validate listingId (CUID), check ownership
- Search rate-limited at 60 req/min per IP
- Reviews require completed escrow transaction
- Path traversal protection in presigned-put route
- All unbounded findMany queries now have take: limits

### Admin Centre
Pages: Dashboard, Users, Verifications, Partners, Listings, Jobs, Escrow,
Companies, Support, Audit Log, Platform, Security (new), Reports (new)

### SEO
- Root layout: full metadata + OpenGraph + Twitter cards
- Marketplace page: canonical, OG, Twitter
- Jobs page: canonical, OG, Twitter
- City/category pages: dynamic metadata + breadcrumb JSON-LD
- Listing/job detail: JSON-LD with XSS-safe serializer
- Sitemap: dynamic, hourly/daily revalidation
- Robots: allows public routes, blocks /admin /api /me

### Performance
- 8 DB indexes added in prior security-audit pass
- Cron digest switched to cursor-based batch processing
- N+1 risk in ATS template includes (medium — deferred)

### Dark Mode / Theme
- Custom CSS data-theme attribute system
- Cookie-persisted preference (xplosale-theme, 1-year TTL)
- ThemeToggle in Navbar (desktop + mobile drawer)
- System preference fallback via CSS media query

---

## Pre-existing Type Errors (not introduced by this pass)

- src/__tests__/integration/auth-ban.test.ts — string literal comparison mismatch
- src/__tests__/setup.ts — NODE_ENV read-only assignment
- src/app/search/page.tsx — union type narrowing issue on result.data
