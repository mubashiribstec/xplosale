# Marketplace Upgrade: OLX + Gumtree Parity + Premium Features

## Context

The existing marketplace has a solid P2P transaction core (listing → search → offer → escrow → review), but lacks the seller credibility systems, discovery mechanisms, trust/reporting tools, and analytics that make OLX and Gumtree dominant classifieds platforms. This plan brings the marketplace to full parity with both platforms and adds differentiating premium features neither has.

---

## What Already Exists (do NOT re-implement)

- Listing CRUD (create, edit, delete) + image upload (up to 10)
- Full-text search + category/region/price/beds filters
- Offer → chat room flow (`OfferButton`, `MessageSellerButton`)
- Escrow with dispute resolution
- `ListingReview` (listing-level, not seller-level)
- `SavedSearch` with frequency (DAILY/WEEKLY)
- Share button, ban enforcement, rate limiting
- Admin approval queue + `AdminActionLog`

---

## Phase 1 — Schema Additions

**Edit:** `prisma/schema.prisma`
**New migration:** `prisma/migrations/20260608000000_marketplace_upgrade/migration.sql`

### 1a. Listing — new fields

```prisma
model Listing {
  ...
  condition          String?          // "NEW" | "USED" | "REFURBISHED"
  negotiable         Boolean @default(true)
  urgent             Boolean @default(false)
  sellerType         String  @default("PRIVATE")  // "PRIVATE" | "BUSINESS"
  deliveryAvailable  Boolean @default(false)
  deliveryCost       Decimal?
  viewCount          Int     @default(0)
  savedCount         Int     @default(0)   // denormalised; updated on save/unsave
  contactCount       Int     @default(0)   // incremented on offer/message
  renewedAt          DateTime?
  bumpedAt           DateTime?
  // relations
  savedBy            SavedListing[]
  questions          ListingQuestion[]
  reports            ListingReport[]
  priceHistory       ListingPriceHistory[]
}
```

### 1b. SellerProfile — ratings + badges + response tracking

```prisma
model SellerProfile {
  ...
  sellerRatingAvg   Float    @default(0)
  sellerRatingCount Int      @default(0)
  responseRate      Float?   // 0–1, updated async
  lastActiveAt      DateTime?
  badges            String[] // e.g. ["TRUSTED", "TOP_RATED", "QUICK_RESPONDER"]
  // relations
  sellerReviews     SellerReview[]
}
```

### 1c. New: SellerReview

```prisma
model SellerReview {
  id              String   @id @default(cuid())
  sellerProfileId String
  authorId        String
  rating          Int      // 1–5
  body            String?  @db.VarChar(1000)
  transactionRef  String?  // listingId for context
  createdAt       DateTime @default(now())
  sellerProfile   SellerProfile @relation(fields: [sellerProfileId], references: [id])
  author          User          @relation(fields: [authorId], references: [id])
  @@unique([sellerProfileId, authorId, transactionRef])
}
```

### 1d. New: SavedListing (favorites/bookmarks)

```prisma
model SavedListing {
  id        String   @id @default(cuid())
  userId    String
  listingId String
  savedAt   DateTime @default(now())
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  @@unique([userId, listingId])
}
```

### 1e. New: ListingQuestion (Q&A)

```prisma
model ListingQuestion {
  id         String    @id @default(cuid())
  listingId  String
  askerId    String
  question   String    @db.VarChar(500)
  answer     String?   @db.VarChar(1000)
  answeredAt DateTime?
  createdAt  DateTime  @default(now())
  listing    Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  asker      User    @relation(fields: [askerId], references: [id])
}
```

### 1f. New: ListingReport

```prisma
enum ReportReason {
  SPAM
  FRAUD
  MISLEADING
  PROHIBITED
  DUPLICATE
  OTHER
}

model ListingReport {
  id         String       @id @default(cuid())
  listingId  String
  reporterId String
  reason     ReportReason
  details    String?      @db.VarChar(500)
  resolved   Boolean      @default(false)
  createdAt  DateTime     @default(now())
  listing    Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  reporter   User    @relation(fields: [reporterId], references: [id])
  @@unique([listingId, reporterId])
}
```

### 1g. New: ListingPriceHistory (Gumtree)

```prisma
model ListingPriceHistory {
  id        String   @id @default(cuid())
  listingId String
  oldPrice  Decimal
  newPrice  Decimal
  changedAt DateTime @default(now())
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
}
```

### 1h. User — add relations for new models

```prisma
model User {
  ...
  savedListings  SavedListing[]
  listingReports ListingReport[]
  sellerReviews  SellerReview[]
}
```

---

## Phase 2 — API Routes

### 2a. Favorites / Saved Listings

**New:** `src/app/api/listings/[listingId]/save/route.ts`
- `POST` — save listing; upsert `SavedListing`; increment `listing.savedCount`
- `DELETE` — unsave; decrement `listing.savedCount`
- `GET` — returns `{ saved: boolean }` for current user

**New:** `src/app/api/me/saved-listings/route.ts`
- `GET` — paginated list of user's saved listings (first image, price, title, status)

### 2b. Seller Reviews

**New:** `src/app/api/sellers/[sellerProfileId]/reviews/route.ts`
- `GET` — paginated reviews (latest 20); include author name, rating, body
- `POST` — create review; requires completed escrow on `transactionRef` listing
  - After create: recalculate `sellerRatingAvg` and `sellerRatingCount` on SellerProfile

### 2c. Listing Reports

**New:** `src/app/api/listings/[listingId]/report/route.ts`
- `POST` — `{ reason, details? }`; one report per user per listing; rate limit 5/hour

**New:** `src/app/api/admin/reports/route.ts` + `src/app/api/admin/reports/[reportId]/route.ts`
- `GET` — unresolved reports list (admin only)
- `PATCH` — mark resolved; optionally reject the listing

### 2d. Q&A on Listings

**New:** `src/app/api/listings/[listingId]/questions/route.ts`
- `GET` — answered questions publicly; unanswered shown only to seller
- `POST` — ask question; rate limit 3/listing/day per user

**New:** `src/app/api/listings/[listingId]/questions/[questionId]/answer/route.ts`
- `POST` — seller answers; sets `answer` + `answeredAt`

### 2e. View Count Tracking

**New:** `src/app/api/listings/[listingId]/view/route.ts`
- `POST` — increment `viewCount`; Redis deduplication (one view per user/IP per 24h)

### 2f. Listing Renewal + Bump

**Edit:** `src/app/api/listings/[listingId]/route.ts` PATCH — add actions:
- `action: "renew"` — extend `expiresAt` by 90 days; listing must be ACTIVE or EXPIRED
- `action: "bump"` — set `bumpedAt = now()`; free once per 7 days; VERIFIED tier for additional bumps
- `action: "price"` — when price decreases, create `ListingPriceHistory` entry + notify saved-listing users

### 2g. Seller Storefront

**New:** `src/app/api/sellers/[sellerProfileId]/route.ts`
- `GET` — SellerProfile + User info + active listings (up to 12) + rating stats + badges

### 2h. Trending Listings

**New:** `src/app/api/listings/trending/route.ts`
- `GET` — top 12 by score: `(viewCount * 0.4 + savedCount * 0.4 + contactCount * 0.2)`; ACTIVE only; last 30 days

---

## Phase 3 — New Pages

### 3a. Seller Storefront
**New:** `src/app/(marketplace)/sellers/[sellerProfileId]/page.tsx`
- Header: avatar, name, member since, verification badge, response rate, badges row
- Star rating bar with distribution (5★ to 1★)
- "Write a Review" button (modal, eligibility check)
- Reviews list + active listings grid

### 3b. Saved Listings
**New:** `src/app/(account)/me/saved-listings/page.tsx`
- Grid of saved ListingCards with ✕ unsave button overlay
- Empty state CTA to browse marketplace

### 3c. My Listings Dashboard (Seller Analytics)
**New/Edit:** `src/app/(account)/me/listings/page.tsx`
- Table: title, status, price, views, saves, contacts, expires, bump/renew buttons
- Summary row: total views, saves, contacts across all listings

---

## Phase 4 — Listing Detail Page Enhancements

**Edit:** `src/app/(marketplace)/m/[listingId]/page.tsx`

| Enhancement | Component | Notes |
|---|---|---|
| Save/Bookmark | `SaveListingButton.tsx` | Heart toggle, count display, auth guard |
| View tracking | inline client island | fires on mount, deduped by Redis |
| Q&A section | `ListingQA.tsx` | Accordion for answered; form for buyers; answer UI for seller |
| Report button | `ReportListingButton.tsx` | Reason dropdown + details modal |
| Seller card | inline | rating stars, badges, response rate, storefront link |
| Condition badge | inline | NEW / USED / REFURBISHED pill |
| Price history | inline | collapsible section if ≥1 change |
| Similar listings | `SimilarListings.tsx` | 4 cards, same category+region |
| Delivery badge | inline | "Delivery available · PKR X" |
| Urgent banner | inline | Red "URGENT" banner when `urgent=true` |
| Watcher count | inline | "👁 234 views · ♡ 12 watching" |
| Fixed Price badge | inline | Shown when `negotiable=false`; hides OfferButton |

---

## Phase 5 — Marketplace Feed Enhancements

**Edit:** `src/app/(marketplace)/m/_components/MarketplaceShell.tsx`

New filters:
- **Condition**: All / New / Used / Refurbished
- **Date posted**: Any / Today / This week / This month
- **Negotiable**: toggle
- **Delivery available**: toggle
- **Seller type**: All / Private / Business

**Edit:** `src/components/shared/ListingCard.tsx`
- Condition badge (NEW/USED pill)
- Negotiable / Fixed Price label
- Save count ("♡ 12")
- Heart/save toggle (client island)
- Seller rating stars
- URGENT red banner
- BUMPED badge (if bumpedAt within 24h)

**Trending row** (unfiltered homepage only):
- "🔥 Trending Now" horizontal scroll, 6 cards from `/api/listings/trending`

---

## Phase 6 — Admin Reports Queue

**New:** `src/app/(admin)/admin/reports/page.tsx`
- Table: listing, reporter, reason, details, date, status
- Actions: View listing / Dismiss / Remove listing
- Unresolved count badge in admin nav

---

## Phase 7 — Gumtree Features Summary

| Feature | Implementation |
|---|---|
| Urgent flag | `urgent` field on Listing; red badge in card + detail |
| Delivery option | `deliveryAvailable` + `deliveryCost` on Listing; badge + filter |
| Ad Bump | `bumpedAt` field; PATCH action; free 1x/week; affects sort |
| Price history | `ListingPriceHistory` model; auto-created on price drop |
| Similar listings | `SimilarListings.tsx` component; same category+region |
| Private/Business | `sellerType` field on Listing; tag in card + filter |
| Make me an offer toggle | `negotiable` field; hides OfferButton when false |
| Watcher count | `savedCount` displayed as "watching" |
| Expiry notifications | daily cron: notify sellers 7 days before expiry |

---

## Phase 8 — Premium Differentiators (Beyond OLX + Gumtree)

### Price Drop Alerts
When price decreases in PATCH `/api/listings/[id]`: create `Notification` for every user in `SavedListing` for that listing. Text: "Price dropped on [title]: now PKR X (was PKR Y)"

### Counter-Offers
The offer/chat flow already supports OFFER messages with `metadata.amount`. Add a "Counter offer" button in the chat thread for the seller to pre-fill an OFFER message with a new amount.

### Seller Badges (auto-awarded on review create + weekly cron)
- `TRUSTED` — verificationStatus=VERIFIED + rated 4★+ by 5+ buyers
- `TOP_RATED` — sellerRatingAvg ≥ 4.5 with ≥ 10 reviews
- `QUICK_RESPONDER` — responseRate ≥ 0.8

### Seller Response Rate (weekly cron)
Track first-reply time in LISTING context chat rooms. `responseRate = responded_within_24h / total_inquiries`

---

## Critical Files

### New files
```
prisma/migrations/20260608000000_marketplace_upgrade/migration.sql
src/app/api/listings/[listingId]/save/route.ts
src/app/api/listings/[listingId]/view/route.ts
src/app/api/listings/[listingId]/report/route.ts
src/app/api/listings/[listingId]/questions/route.ts
src/app/api/listings/[listingId]/questions/[questionId]/answer/route.ts
src/app/api/listings/trending/route.ts
src/app/api/sellers/[sellerProfileId]/route.ts
src/app/api/sellers/[sellerProfileId]/reviews/route.ts
src/app/api/me/saved-listings/route.ts
src/app/api/admin/reports/route.ts
src/app/api/admin/reports/[reportId]/route.ts
src/app/api/cron/listing-expiry-notify/route.ts
src/app/(marketplace)/sellers/[sellerProfileId]/page.tsx
src/app/(account)/me/saved-listings/page.tsx
src/app/(admin)/admin/reports/page.tsx
src/components/shared/marketplace/SaveListingButton.tsx
src/components/shared/marketplace/ListingQA.tsx
src/components/shared/marketplace/ReportListingButton.tsx
src/components/shared/marketplace/SimilarListings.tsx
```

### Edited files
```
prisma/schema.prisma
src/app/(marketplace)/m/[listingId]/page.tsx
src/app/(marketplace)/m/_components/MarketplaceShell.tsx
src/app/api/listings/[listingId]/route.ts
src/app/api/listings/route.ts
src/components/shared/ListingCard.tsx
src/components/shared/OfferButton.tsx
```
