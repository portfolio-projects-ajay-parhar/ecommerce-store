# Phase 7 — Wishlist & Reviews

## Goals
1. Wishlist with idempotent toggling
2. Reviews **gated on verified purchase** (the distinguishing e-commerce feature)
3. Denormalized rating aggregates kept consistent

## Steps

### 7.1 Wishlist
- `POST /api/wishlist/[productId]` — upsert `WishlistItem` on unique `(userId, productId)`; product must be ACTIVE
- `DELETE /api/wishlist/[productId]` — delete if exists (idempotent 204 either way)
- `GET /api/wishlist` — items with product name/slug/image/price/availability
- `WishlistButton` client component: heart toggle, optimistic, unauthenticated → redirect to `/signin?callbackUrl=…` (Project 6 like-button pattern)
- `/wishlist` page: grid of saved products with add-to-cart shortcut

### 7.2 Verified purchase check (src/lib/purchase.ts)
```ts
hasPurchased(userId, productId) →
  prisma.orderItem.findFirst({
    where: { productId,
             order: { userId, status: { in: ["PAID","PROCESSING","SHIPPED","DELIVERED"] } } },
  }) !== null
```
Exported and unit-tested.

### 7.3 Review write API
`POST /api/products/[id]/reviews` — requireUser + rate limit:
- zod: `rating` int 1–5, `title?` ≤ 120, `body` 10–2000
- `403` unless `hasPurchased` (message: "Only verified buyers can review")
- unique `(productId, userId)` → `409 "You already reviewed this product"`
- Create `Review` **and** recompute aggregates in one transaction:
  ```ts
  const agg = await tx.review.aggregate({
    where: { productId, status: "PUBLISHED" },
    _avg: { rating: true }, _count: true,
  });
  await tx.product.update({ where: { id: productId },
    data: { avgRating: agg._avg.rating ?? 0, reviewCount: agg._count } });
  ```

### 7.4 Review read + moderation
- `GET /api/products/[id]/reviews` — PUBLISHED only, newest first, cursor pagination, includes reviewer name
- `PATCH /api/reviews/[id]` — author (edit body/rating → recompute aggregates) or ADMIN (status)
- `DELETE /api/reviews/[id]` — author or ADMIN; aggregates recomputed
- Admin moderation endpoint (Phase 9) flips `PUBLISHED ↔ HIDDEN`; HIDDEN reviews are excluded from the public list **and** from aggregates

### 7.5 Product page integration (used by Phase 8)
- Reviews section: average + star breakdown + list
- CTA states: not purchased → "Reviews are for verified buyers"; purchased & unreviewed → composer; already reviewed → "Edit your review"

## Done When
- Non-buyer POST review → 403; buyer POST → 201 and appears publicly
- Second review by same user → 409
- Hiding a review via admin drops it from the list and updates `avgRating`/`reviewCount`
- Editing own review updates aggregates
- Wishlist toggle twice leaves exactly one row (upsert verified)