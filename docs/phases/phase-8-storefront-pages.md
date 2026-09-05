# Phase 8 — Storefront Pages

## Goals
Assemble the customer-facing surface from Phases 3–7: server-rendered, SEO-aware pages with loading/empty states everywhere.

## Pages

### 8.1 Layout & chrome
- `(public)/layout.tsx` — navbar (logo, search, wishlist, cart badge, account menu, theme toggle) + footer
- Reuse from Project 6: `ThemeProvider`, `SearchInput` (debounced), `Pagination` (cursor), `EmptyState`, `LoadingSkeleton`, `ConfirmDialog`, `Toast`

### 8.2 Home `/`
- Hero + search CTA
- Featured rail (`status ACTIVE, featured`) — server component
- New arrivals (latest 8 by `createdAt`)
- Category tiles (ACTIVE categories)
- `generateMetadata` (title/description)

### 8.3 Products listing `/products`
- Server component reading `searchParams`: `q`, `categoryId`, `minPrice`, `maxPrice`, `sort`, `cursor`
- Filter bar (category select, price inputs, sort dropdown) updates the URL (shareable/SEO-friendly)
- Debounced search input
- Product grid (image, name, price + compare-at strikethrough, star rating, stock chip, add-to-cart)
- Cursor pagination + empty state

### 8.4 Product detail `/products/[slug]`
- `generateMetadata`: name, description excerpt, OG image (first image)
- Image gallery (thumbnails switch main image)
- Price, compare-at, rating summary, stock indicator ("In stock", "Only 2 left" ≤ threshold, "Out of stock")
- Add to cart (disabled + label when unavailable), wishlist heart
- Description rendered from sanitized HTML (`prose` classes + render-time sanitize)
- Reviews section (Phase 7), related products (same category, exclude self)

### 8.5 Category page `/categories/[slug]`
- Reuses the listing grid filtered by category + `generateMetadata` per category

### 8.6 Cart `/cart`
- Phase 4 page + handle `?cancelled=1` toast

### 8.7 Checkout & success
- `/checkout` (Phase 5), `/checkout/success` (Phase 5 polling)

### 8.8 Wishlist `/wishlist`
- Phase 7 page

### 8.9 Account `/account/*`
- `profile` — name, phone, password change (optional stretch)
- `addresses` — CRUD + default (Phase 5)
- `orders` — list with status badges (StatusBadge component with per-status colors)
- `orders/[id]` — items, totals, shipping snapshot, status timeline (placed → paid → …), "Pay again" for PENDING orders (re-creates a session for that order)

### 8.10 Loading & errors
- `loading.tsx` skeleton on every public segment; `not-found.tsx` for bad slugs; global `error.tsx`

## Done When
- Full anonymous journey works: home → search → filters → detail → sign-in prompt on add-to-cart
- Full signed-in journey works: browse → cart → checkout → success → order appears in `/account/orders`
- Every page has a loading skeleton and a designed empty state
- `generateMetadata` produces correct OG tags on product + category pages (check with view-source)
- Direct visits to `/checkout` with an empty cart redirect to `/cart`