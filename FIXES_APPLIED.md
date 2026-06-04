# Xplosale — Fixes Applied (Pass 2)

---

## Batch 1 — Critical Trust & Integrity
**Branch:** `fix/batch-1-trust` | **Date:** 2026-06-04

### C1 — Fabricated metrics replaced with live Prisma queries
**File:** `src/app/(marketing)/page.tsx`
- Component converted from `function` to `async function`
- Added `prisma` import
- Four real DB queries: `verifiedCount`, `activeListings`, `activeJobs`, `totalUsers`
- `fmt()` helper: formats numbers as "0", "1.2k", etc.
- Hero trust line: shows `verifiedCount` or "Be the first verified account" when 0
- Hero dark card stats grid: now shows real `verifiedCount / activeListings / activeJobs / totalUsers`
- Trust stats strip: all four metrics now from live Prisma queries; zero-state copy added
- Vertical cards: metrics show real counts or empty-state copy ("Post the first listing", etc.)

### C2 — NADRA/biometric claims removed
**File:** `src/app/(marketing)/page.tsx`
- Line 77: "CNIC + biometrics" → "CNIC documents" → "reviews every identity document"
- Hero dark card caption: "Identity verification powered by NADRA" → "Documents reviewed by our team"
- Verification step #02: "cross-check with NADRA in real time" → "our team reviews it manually"
- Step title: "CNIC capture" → "Document upload"

### H5 — Three verticals rewritten as two verticals + trust layer
**File:** `src/app/(marketing)/page.tsx`
- Section heading: "One platform. Three trusted verticals." → "Two verticals. One verified identity."
- Kept three cards but third card is now "Your identity, verified." (trust cross-cutting layer, not a Network vertical)
- All metric strings removed from the `[...].map()` array — each card computes its own live count inline
- "Live now" bottom row removed (was a static decoration)

### L3 — Fabricated testimonials removed
**File:** `src/app/(marketing)/page.tsx`
- Testimonials section (Asad Khan, Sana Rizvi, Fahad Qureshi) wrapped in `{false && ...}` to remove from render
- Will be restored when real user quotes are available
