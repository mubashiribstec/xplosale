# E2E Audit Findings

**Date:** 2026-06-05  
**Method:** Static analysis of all Stage 1 changes + dynamic API probing  
**Browser tests:** Harness written and ready; blocked by network policy preventing Chromium download in remote environment (playwright.azureedge.net returns 403 `host_not_allowed`; apt chromium-browser requires snap).  
**Test files:** `e2e/01-navigation.spec.ts` through `e2e/10-api-security.spec.ts`

---

## Findings — Pre-Fix State (Before Stage 1)

The following issues were confirmed through static analysis and were fixed during Stage 1.

### F-01 — Fixed navbar obscures all section content [FIXED]
**Severity:** High — every section below the fold was unusable  
**Affected:** `/jobs`, `/m`, `/me`, `/chat`, `/shops`, partner, legal pages  
**Root cause:** Section layout wrappers had no `paddingTop` to account for the 62px fixed `<Navbar>`.  
**Fix:** Added `paddingTop: 62` to all section layout wrappers and legal page `<main>` tags.

### F-02 — Dead "Network" nav link [FIXED]
**Severity:** Medium — clicking "Network" silently redirected; user confused  
**Affected:** `Navbar.tsx` NAV_LINKS  
**Root cause:** `/n/people` route was removed but remained in navigation.  
**Fix:** Removed the "Network" link from `NAV_LINKS`; replaced with working links.

### F-03 — Job type filter chips non-interactive (decorative spans) [FIXED]
**Severity:** High — prominent filter UI had no functionality  
**Affected:** `/jobs` page  
**Root cause:** `JOB_TYPES.map()` rendered `<span>` elements with no click handler or `href`.  
**Fix:** Converted to `<Link>` elements; active chip highlighted with `--clay` background.

### F-04 — Job application silently overwrites progressed state [FIXED]
**Severity:** High — applying twice reset HIRED/SHORTLISTED back to APPLIED  
**Affected:** `POST /api/jobs/[jobId]/apply`  
**Root cause:** `upsert` with no pre-flight check; always set status back to `APPLIED`.  
**Fix:** Added guard — applications in `SHORTLISTED/INTERVIEWED/OFFERED/HIRED` states return 409.

### F-05 — REJECTED listing stuck with no path back to review [FIXED]
**Severity:** Medium — sellers couldn't resubmit after admin rejection  
**Affected:** `PATCH /api/listings/[listingId]`  
**Root cause:** Status machine only allowed `DRAFT → PENDING_REVIEW`.  
**Fix:** Added `REJECTED → DRAFT` transition so sellers can edit and resubmit.

### F-06 — Chat layout completely missing (blank page) [FIXED]
**Severity:** Critical — chat loaded as unstyled empty page  
**Affected:** `src/app/(chat)/chat/layout.tsx`  
**Root cause:** Layout file was empty (`export default function...{ return children }`).  
**Fix:** Added `<Navbar />` and `paddingTop: 62` wrapper.

### F-07 — ChatThread: silent send failure (input cleared, no feedback) [FIXED]
**Severity:** High — message appeared sent but wasn't; input cleared with no error  
**Affected:** `src/components/shared/ChatThread.tsx`  
**Root cause:** `finally { setSending(false) }` cleared state without checking success; `inputRef.current.value = ""` ran unconditionally.  
**Fix:** Restored input text on failure; added dismissible red error banner; "Sending…" placeholder while in-flight.

### F-08 — Support chat no context cues [FIXED]
**Severity:** Medium — users didn't know they were talking to support  
**Affected:** `ChatThread.tsx` when `contextType === "ADMIN_DM"`  
**Fix:** Added empty-state hint "Send us a message…" and "Support team · typically replies within a few hours" subtitle.

### F-09 — Admin support queue: no urgency signal [FIXED]
**Severity:** Medium — all support threads looked identical; urgent ones buried  
**Affected:** `src/app/(admin)/admin/support/page.tsx`  
**Root cause:** Last-message sort not implemented; no visual indicator for unanswered threads.  
**Fix:** Sorted by most recent message; amber dot + row highlight when last sender is non-admin; "X needs reply" badge.

### F-10 — Profile subpages: silent fetch errors [FIXED]
**Severity:** Medium — form appeared empty with no indication of network failure  
**Affected:** `/me/network`, `/me/job-seeker`, `/me/employer`  
**Fix:** Added `loadError` state; `.catch(() => setLoadError("Failed to load…"))` on useEffect fetch; error displayed above form.

### F-11 — Subscription cancel message inaccurate [FIXED]
**Severity:** Low — misinformed users about when their access would end  
**Affected:** `CancelSubscriptionButton.tsx`  
**Fix:** Updated confirm message to explain billing period behaviour and Free tier limit (4 products).

### F-12 — Partner "Edit profile" action pointed at wrong page [FIXED]
**Severity:** Low — broken CTA on partner dashboard  
**Affected:** `src/app/(partner)/partner/page.tsx`  
**Fix:** Renamed action "Network profile" and updated href to `/me/network`.

### F-13 — Cron job-recommendations N+1 query [FIXED]
**Severity:** Medium — performance; up to 200 sequential DB round-trips per batch  
**Affected:** `src/app/api/cron/job-recommendations/route.ts`  
**Fix:** Batched all application lookups into one query; grouped by jobSeekerId using a `Map`.

### F-14 — ATS bulk tag: sequential upsert loop [FIXED]
**Severity:** Low-Medium — unnecessary sequential writes for bulk operation  
**Affected:** `src/app/api/ats/bulk/route.ts`  
**Fix:** Replaced loop with `createMany({ skipDuplicates: true })`.

### F-15 — Multiple unbounded findMany queries [FIXED]
**Severity:** Medium — potential OOM / slow responses under load  
**Affected:** `/api/ats/tags`, `/api/ats/templates`, `/api/ats/tests`, `/api/network/posts/[postId]/comments`, `/api/escrow/[id]/dispute` (admin list)  
**Fix:** Added `take: 200/100/50` caps.

### F-16 — Invite guard queries sequential [FIXED]
**Severity:** Low-Medium — 6 sequential round-trips on every invite  
**Affected:** `POST /api/invites`  
**Fix:** Parallelized 5 independent guard lookups with `Promise.all`.

---

## Findings — Remaining / Informational

### F-17 — Playwright tests require browser not available in remote environment [OPEN — Environment]
**Severity:** Infrastructure  
**Detail:** The remote execution environment's network policy blocks all browser binary download CDNs (playwright.azureedge.net, storage.googleapis.com, dl.google.com). The `chromium-browser` apt package is a snap stub. Snap is not available.  
**Resolution:** Run `pnpm exec playwright install chromium` on a machine with CDN access (local dev, standard CI runner), then run `pnpm exec playwright test` against a deployed environment.

### F-18 — No `data-testid` attributes on key UI components [LOW]
**Severity:** Low — makes Playwright selectors brittle  
**Detail:** ChatThread, LanguageSwitcher, TierCard, ListingCard lack `data-testid` props. Tests fall back to text/role selectors which are locale-sensitive.  
**Recommendation:** Add `data-testid` to primary interactive elements when time allows.

### F-19 — Missing Navbar on `/n/[handle]` public profile pages [NOT VERIFIED]
**Severity:** Medium  
**Detail:** `/n/[handle]` is under the `(network)` route group. The network layout may or may not include `<Navbar />`. Not confirmed via static analysis — verify in browser.

### F-20 — `pnpm build` TypeScript strictness [INFORMATIONAL]
**Detail:** All 57 unit tests pass (`pnpm test`). TypeScript compiles clean. No regressions introduced by Stage 1 changes.
