# E2E Fixes Applied

**Date:** 2026-06-05  
**Companion:** E2E_FINDINGS.md

---

## Fixes Shipped in This Session (Stage 1)

All items below were applied and committed to `main`.

| ID | File(s) | Change |
|----|---------|--------|
| F-01 | `(marketplace)/layout.tsx`, `(jobs)/layout.tsx`, `(shops)/layout.tsx`, `(profile)/layout.tsx`, `(account)/layout.tsx`, `(partner)/partner/layout.tsx`, `(marketing)/privacy/page.tsx`, `cookies/page.tsx`, `terms/page.tsx` | Added `paddingTop: 62` to clear fixed navbar |
| F-02 | `components/layout/Navbar.tsx` | Removed dead `/n/people` "Network" nav link |
| F-03 | `(jobs)/jobs/page.tsx` | Converted job-type chips from `<span>` to `<Link>` with active-state highlight |
| F-04 | `api/jobs/[jobId]/apply/route.ts` | Pre-flight check blocks re-apply on progressed applications (409) |
| F-05 | `api/listings/[listingId]/route.ts` | Added `REJECTED → DRAFT` status transition |
| F-06 | `(chat)/chat/layout.tsx` | Added `<Navbar />` + `paddingTop: 62` wrapper |
| F-07 | `components/shared/ChatThread.tsx` | Restore input on failure; dismissible error banner; "Sending…" state |
| F-08 | `components/shared/ChatThread.tsx` | Support context hints (empty state + subtitle) when `contextType === "ADMIN_DM"` |
| F-09 | `(admin)/admin/support/page.tsx` | Sort by recency; amber row + "needs reply" badge for unanswered threads |
| F-10 | `(account)/me/network/page.tsx`, `me/job-seeker/page.tsx`, `me/employer/page.tsx` | Load error state on all three profile subpages |
| F-11 | `components/shared/shops/CancelSubscriptionButton.tsx` | Accurate cancel confirmation message |
| F-12 | `(partner)/partner/page.tsx` | "Edit profile" → "Network profile" with correct href |
| F-13 | `api/cron/job-recommendations/route.ts` | Batch applications query outside loop; Map grouping eliminates N+1 |
| F-14 | `api/ats/bulk/route.ts` | Replace sequential upsert loop with `createMany({ skipDuplicates: true })` |
| F-15 | `api/ats/tags/route.ts`, `api/ats/templates/route.ts`, `api/ats/tests/route.ts`, `api/network/posts/[postId]/comments/route.ts`, `api/escrow/[id]/dispute/route.ts` | Added `take` caps on unbounded `findMany` |
| F-16 | `api/invites/route.ts` | Parallelized 5 independent guard lookups with `Promise.all` |

---

## Stage 2 Test Infrastructure (Ready to Run)

The Playwright harness is fully written and committed. To run:

```bash
# 1. Install browser (on a machine with CDN access)
pnpm exec playwright install chromium

# 2. Start the test database and apply migrations
createdb xplosale_test
DATABASE_URL="postgresql://xplosale_test:xplosale_test@localhost:5432/xplosale_test" \
  npx prisma migrate deploy

# 3. Start the dev server in test mode
DATABASE_URL="postgresql://xplosale_test:xplosale_test@localhost:5432/xplosale_test" \
  NEXTAUTH_SECRET="0zxW7RvOoIwsaNqdYLk8aJfs6DBT5RH42zPhvTPstEQ=" \
  pnpm dev &

# 4. Run the suite
pnpm exec playwright test
```

### Test files

| File | Tests |
|------|-------|
| `e2e/01-navigation.spec.ts` | Navbar present on all sections; content below 62px; routing |
| `e2e/02-auth.spec.ts` | Unauthenticated redirects; login page tabs; admin rejection |
| `e2e/03-marketplace.spec.ts` | Listing grid; tier limit 422; create form per tier |
| `e2e/04-jobs.spec.ts` | Job type chips are links; active chip; sidebar offset |
| `e2e/05-account.spec.ts` | /me per tier; profile subpages; tier badge text |
| `e2e/06-chat.spec.ts` | Chat layout navbar; content offset; send error |
| `e2e/07-admin.spec.ts` | Admin route protection; support/partner/verification queues |
| `e2e/08-i18n.spec.ts` | Language switcher; RTL on ar/ur; all 7 locale codes accepted |
| `e2e/09-tiers.spec.ts` | Tier card text; partner gating; listing cap |
| `e2e/10-api-security.spec.ts` | 401 on all protected endpoints without session; 422 on bad input |

---

## Remaining Work

- **F-17:** Run Playwright suite once browser is available in CI (GitHub Actions standard runner has Chromium).
- **F-18:** Add `data-testid` attributes to key components to stabilize selectors.
- **F-19:** Confirm Navbar presence on `/n/[handle]` public profile pages in browser.
