# E-Commerce Store — Complete Build Guide

## Project Overview

The first **Intermediate** project of the 20-project curriculum, and the first one that looks and behaves like a **commercial application**:

- **Customers** — browse/search/filter products, manage a cart and wishlist, pay with Stripe, receive order-confirmation emails, and leave verified-purchase reviews
- **Admins** — manage products, categories, inventory, orders, customers, and read a sales dashboard

Everything from Project 6 (RBAC, image uploads, sanitized content, cursor pagination) is reused. Project 7 adds five genuinely new production concerns:

1. **Money handling** — all amounts stored as integer cents; prices **snapshotted** onto `OrderItem` so historical orders never change when a product price changes
2. **Payment gateway** — Stripe Checkout (hosted page, test mode) + **webhooks**
3. **Transactions & concurrency** — checkout decrements inventory inside a DB transaction using conditional updates so two buyers can never oversell the last unit
4. **Webhook idempotency** — a `WebhookEvent` table keyed by Stripe event id; replays are no-ops
5. **CI/CD** — GitHub Actions pipeline (lint → type-check → test → build) from day one, optional Docker for local Postgres

---

## Tech Stack

```text
Next.js 16 (App Router)          # same version/foundation as Project 6
TypeScript
Tailwind CSS v4
Supabase Postgres                # pooled (6543) runtime + direct (5432) migrations
Prisma 6                         # ORM
NextAuth v4                      # Credentials + JWT; roles CUSTOMER | ADMIN
Stripe                           # Checkout Sessions + webhooks (test mode)
Resend                           # transactional email (order confirmation)
Pluggable media storage          # Cloudinary | S3 — same storage abstraction as Project 6
TanStack Query v5 + Axios
Zod + React Hook Form
bcryptjs, slugify, date-fns, lucide-react
Vitest                           # unit tests
GitHub Actions                   # CI/CD (new for Project 7)
Docker + docker-compose          # optional local Postgres
```

> **Why Stripe Checkout (not Payment Elements)?** Checkout is a hosted page: PCI scope stays minimal, the webhook contract is small (`checkout.session.completed`), and it is exactly what a portfolio demo needs. Payment Elements can be a stretch goal.

> **Why Supabase Postgres again?** Same DB, same connection pattern as Project 6 (`DATABASE_URL` pooled + `DIRECT_URL` direct). Zero new infra.

---

## Architecture

### Route trees

```text
src/app/
├── (public)/                        # storefront — server-rendered, SEO-aware
│    ├── page.tsx                    # home: hero, featured, categories, new arrivals
│    ├── products/
│    │    ├── page.tsx               # listing: search + filters + sort + pagination
│    │    └── [slug]/page.tsx        # detail: gallery, stock, add-to-cart, reviews
│    ├── categories/[slug]/page.tsx
│    ├── cart/page.tsx
│    ├── checkout/success/page.tsx   # Stripe return URL
│    ├── wishlist/page.tsx
│    └── account/
│         ├── profile/page.tsx
│         ├── addresses/page.tsx
│         └── orders/page.tsx + orders/[id]/page.tsx
├── (auth)/
│    ├── signin/page.tsx
│    └── signup/page.tsx
└── (admin)/                         # ADMIN only
     └── admin/
          ├── page.tsx               # sales dashboard (KPIs + chart)
          ├── products/page.tsx + new + [id]/edit
          ├── inventory/page.tsx
          ├── orders/page.tsx + [id]/page.tsx
          ├── customers/page.tsx
          └── reviews/page.tsx
```

API routes live under `src/app/api/*` (full list in PLAN §API Surface).

### Request flow — browse → cart → checkout → paid

```text
browse:
   Browser → Next.js server component → Prisma (Product + Category + Inventory + _count)
            → render + generateMetadata

add to cart:
   signed-in:  POST /api/cart/items → validate against Inventory → upsert CartItem
   guest:      localStorage cart (CartProvider) → merged into DB cart on sign-in

checkout:
   POST /api/checkout/session
      → prisma.$transaction:
          1. load cart items + current prices
          2. FOR each item: UPDATE Inventory SET qty = qty - n
             WHERE productId = X AND qty >= n   (conditional update = no oversell)
             → if updatedCount === 0 → abort whole tx → 409 OUT_OF_STOCK
          3. create Order (PENDING) + OrderItems (price snapshot)
          4. create Payment row (PENDING)
      → create Stripe Checkout Session (metadata.orderId) → return url
   Browser → Stripe hosted page → returns to /checkout/success?session_id=...

payment confirmed (async):
   Stripe → POST /api/webhooks/stripe
      → verify signature → INSERT WebhookEvent (idempotency) → if new:
          checkout.session.completed → Order PAID + Payment SUCCEEDED
                                       → send confirmation email (Resend)
          checkout.session.expired   → restore inventory, cancel Order
          charge.refunded            → Order REFUNDED, restock items
```

## Database Schema

```text
User (extends NextAuth)
 ├── id, email, name, image, passwordHash
 ├── role                (CUSTOMER | ADMIN)
 ├── phone?
 ├── Addresses[]  ── Address: label?, fullName, line1, line2?, city, state?, postalCode,
 │                             country, phone?, isDefault
 ├── Cart                (1:1, one active cart per user)
 ├── Wishlist  ── WishlistItem (composite unique userId+productId)
 ├── Orders[]
 └── Reviews[]

Category ── id, slug (unique), name, description?, imageUrl?, isActive
Product  ── id, slug (unique), name, description (sanitized HTML), priceCents (int),
            compareAtPriceCents?, status (DRAFT|ACTIVE|ARCHIVED), featured (bool),
            categoryId → Category, images[] → ProductImage (url, alt?, sortOrder),
            avgRating (denormalized, default 0), reviewCount (denormalized, default 0)
Inventory ── productId (1:1 unique), sku (unique), quantityOnHand, lowStockThreshold (default 5)
Cart      ── id, userId (unique)
CartItem  ── cartId, productId, quantity, unique (cartId, productId)
Order     ── id, number (unique, human-readable "ORD-2026-0001"), userId,
             status (PENDING|PAID|PROCESSING|SHIPPED|DELIVERED|CANCELLED|REFUNDED),
             subtotalCents, shippingCents, totalCents,
             shipping snapshot (name, line1, line2, city, state, postal, country, phone),
             stripeSessionId (unique), stripePaymentIntentId?,
             placedAt, paidAt?, shippedAt?, deliveredAt?, cancelledAt?
OrderItem ── orderId, productId?, productName (snapshot), productSlug (snapshot),
             unitPriceCents (snapshot), quantity, lineTotalCents
Payment   ── orderId (1:1), provider (STRIPE), providerRef?, amountCents,
             status (PENDING|SUCCEEDED|FAILED|REFUNDED), createdAt
Review    ── productId, userId, rating (1–5), title?, body, status (PUBLISHED|HIDDEN),
             unique (productId, userId)
WebhookEvent ── eventId (unique, Stripe event id), type, payload (Json), processedAt
EmailLog  ── to, template, subject, status (SENT|FAILED|SKIPPED), orderId?, createdAt
```

### Indexes

| Table | Index | Reason |
|---|---|---|
| `Product` | `slug` UNIQUE | Direct lookup from storefront URL |
| `Product` | `(status, createdAt DESC)` | New-arrivals + default listing sort |
| `Product` | `(categoryId, status)` | Category pages |
| `Product` | `(status, featured)` | Home featured rail |
| `Product` | `(status, priceCents)` | Price sort/filter |
| `Inventory` | `(quantityOnHand)` | Low-stock dashboard query |
| `CartItem` | `(cartId, productId)` UNIQUE | Idempotent add-to-cart |
| `Order` | `(userId, placedAt DESC)` | "My orders" |
| `Order` | `(status, placedAt DESC)` | Admin order queue |
| `Order` | `stripeSessionId` UNIQUE | Webhook → order lookup |
| `Order` | `number` UNIQUE | Human-readable references |
| `Review` | `(productId, userId)` UNIQUE | One review per user per product |
| `Review` | `(productId, status, createdAt DESC)` | Review list on product page |
| `WebhookEvent` | `eventId` UNIQUE | Webhook idempotency |

### Key invariants

- **Money is integer cents everywhere.** Format only at the UI edge (`formatMoney` helper).
- **OrderItem snapshots** name/slug/unit price — a later product edit or price change never rewrites history.
- **Stock correctness** comes from conditional updates (`updateMany WHERE quantityOnHand >= n`) inside the checkout transaction — never read-then-write.
- **Webhooks are idempotent** — the `WebhookEvent` unique key makes Stripe replays safe no-ops.

## API Surface

| Method | Route | Guard |
|---|---|---|
| POST | `/api/auth/register` | public (rate-limited) |
| POST | `/api/auth/[...nextauth]` | NextAuth credentials |
| GET | `/api/products?q&categoryId&minPrice&maxPrice&sort&cursor` | public (ACTIVE only) |
| GET | `/api/products/[slug]` | public (DRAFT 404 unless ADMIN) |
| POST/PATCH/DELETE | `/api/products` + `/[id]` | ADMIN |
| GET/POST | `/api/categories` + PATCH/DELETE `/[id]` | GET public · write ADMIN |
| GET | `/api/cart` | signed-in |
| POST/PATCH/DELETE | `/api/cart/items` + `/[id]` | signed-in (validated vs inventory) |
| DELETE | `/api/cart` | signed-in (empty cart) |
| GET/POST/DELETE | `/api/wishlist` + `/[productId]` | signed-in |
| POST | `/api/checkout/session` | signed-in (runs the inventory transaction) |
| POST | `/api/webhooks/stripe` | public + **Stripe signature** |
| GET | `/api/orders` | signed-in (own orders) |
| GET/PATCH | `/api/orders/[id]` | owner · ADMIN can PATCH status |
| GET/POST | `/api/products/[id]/reviews` | GET public · POST signed-in + verified purchase |
| PATCH/DELETE | `/api/reviews/[id]` | review author or ADMIN |
| GET/PATCH | `/api/admin/inventory` | ADMIN (adjust stock) |
| GET | `/api/admin/stats` | ADMIN (dashboard KPIs + 30-day series) |
| GET | `/api/admin/orders`, `/api/admin/customers` | ADMIN |
| GET/PATCH | `/api/admin/reviews` + `/[id]` | ADMIN (moderation) |
| GET/POST/DELETE | `/api/media` + `/[id]` | signed-in (owner) — reused from Project 6 |
| GET/PATCH | `/api/profile`, `/api/addresses` + `/[id]` | signed-in |

Errors normalized to `{ error: string }` (400/401/403/404/409/422/429/500). `409 OUT_OF_STOCK` carries the offending product for UI recovery.

---

## Security

- Webhook endpoint verifies the **Stripe signature** (`stripe.webhooks.constructEvent`) and rejects anything else — plus idempotency via `WebhookEvent`.
- **Totals are recomputed server-side** from current product prices; the client never sends amounts.
- Conditional inventory updates + checkout transaction prevent overselling and partial orders.
- Same-origin checks and per-route rate limits on register, checkout, reviews, media upload (Project 6 pattern).
- Ownership checks on every cart/wishlist/order/review mutation; ADMIN routes behind `requireAdmin()`.
- Product `description` HTML sanitized on write and at render (Project 6 pipeline).

---

## Phase Overview

| # | Phase | Deliverable |
|---|---|---|
| 1 | Project Setup & Database | Scaffold, env, full Prisma schema, seed |
| 2 | Authentication & Roles | NextAuth, CUSTOMER/ADMIN, guards, auth pages |
| 3 | Product Catalog & Media | Admin product CRUD, public catalog APIs, uploads |
| 4 | Shopping Cart | DB cart + guest cart + merge, cart APIs, cart page |
| 5 | Checkout & Payments | Stripe Checkout session, inventory transaction, orders |
| 6 | Webhooks & Email | Webhook handler, idempotency, order emails, refunds |
| 7 | Wishlist & Reviews | Wishlist, verified-purchase reviews, rating aggregates |
| 8 | Storefront Pages | Home, listing, detail, cart, success, account |
| 9 | Admin Dashboard | Sales KPIs, products, inventory, orders, customers, reviews |
| 10 | Testing & Security | Vitest unit tests, smoke scripts, oversell test |
| 11 | CI/CD & Deployment | GitHub Actions, optional Docker, Vercel, Stripe live config |
| 12 | Documentation & Portfolio | README (17 sections), diagrams, demo GIF |

Each phase has its own file in [`phases/`](./phases/). Work **in order** — every phase depends on the previous one.

