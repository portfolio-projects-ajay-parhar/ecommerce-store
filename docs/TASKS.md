# E-Commerce Store — Agent Task List

> **STATUS: NOT STARTED (2026-09-04)** — plan complete, implementation pending.

> Derived from [`PLAN.md`](./PLAN.md) and the individual files in the [`phases/`](./phases/) directory. Work through phases **in order** — each phase depends on the previous one being complete. Mark tasks `[/]` when in progress and `[x]` when done.

---

## Prerequisites & Environment

- [ ] **Supabase project** provisioned (Postgres pooled 6543 + direct 5432 connection strings)
- [ ] **Stripe account** (test mode) — publishable + secret keys; webhook secret created in Phase 6
- [ ] **Resend account** (free tier) — API key + verified sender domain
- [ ] **Cloudinary or S3** keys (same media providers as Project 6)
- [ ] Node.js >= 18 and npm available in PATH
- [ ] `gh` CLI authenticated (for repo creation + Actions)

---

## Phase 1 — Project Setup & Database

### 1.1 Scaffold
- [ ] `npx create-next-app@latest ecommerce-store --typescript --tailwind --eslint --app --src-dir`
- [ ] Install deps:
  - `prisma @prisma/client`
  - `@tanstack/react-query axios`
  - `next-auth @auth/prisma-adapter bcryptjs`
  - `stripe`, `zod react-hook-form @hookform/resolvers`
  - `resend`, `date-fns slugify`, `lucide-react`
  - `image-size` (+ Cloudinary/S3 packages per Project 6 storage pattern)
  - dev: `@types/bcryptjs tsx vitest`

### 1.2 Environment Variables
- [ ] `.env.local`: `DATABASE_URL` (pooled), `DIRECT_URL` (direct), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (Phase 6), `RESEND_API_KEY`, `EMAIL_FROM`, storage provider vars
- [ ] `.env.example` mirroring all vars with placeholders

### 1.3 Prisma Schema
- [ ] NextAuth models: `User`, `Account`, `Session`, `VerificationToken`
- [ ] `User` additions: `role` (CUSTOMER|ADMIN, default CUSTOMER), `phone?`
- [ ] `Address` (label?, fullName, line1, line2?, city, state?, postalCode, country, phone?, isDefault, userId)
- [ ] `Category`, `Product`, `ProductImage`, `Inventory` (1:1 product, sku unique, quantityOnHand, lowStockThreshold)
- [ ] `Cart`, `CartItem` (unique cartId+productId)
- [ ] `Order`, `OrderItem` (price/name snapshots), `Payment`
- [ ] `Review` (unique productId+userId), `WishlistItem` (unique userId+productId)
- [ ] `WebhookEvent` (eventId unique), `EmailLog`
- [ ] Enums: `Role`, `ProductStatus`, `OrderStatus`, `PaymentStatus`, `PaymentProvider`, `ReviewStatus`
- [ ] All indexes from PLAN.md (product slugs/sorts, order lookups, webhook idempotency)
- [ ] `npx prisma migrate dev --name init` + `npx prisma generate`
- [ ] Singleton client `src/lib/prisma.ts` (Project 6 pattern)

### 1.4 Seed (prisma/seed.ts)
- [ ] 1 ADMIN, 5 CUSTOMERs (password `Password123!`)
- [ ] 6 categories, 24 products (real prices in cents, 1–3 images each, 1 with compareAtPrice)
- [ ] Inventory rows for every product (include 1 product with stock 1 and 2 out-of-stock products for testing)
- [ ] Package script: `"db:seed": "tsx prisma/seed.ts"`

### 1.5 Config & Layout
- [ ] `next.config.ts` — `images.remotePatterns` (storage provider + picsum/unsplash)
- [ ] `src/app/layout.tsx` + `globals.css` + providers wrapper placeholder
- [ ] `src/lib/money.ts` — `formatMoney(cents)`, `parseMoneyToCents(input)`

---

## Phase 2 — Authentication & Roles

- [ ] NextAuth options (Credentials + Prisma adapter + JWT), `session.strategy: "jwt"`
- [ ] JWT/session callbacks copying `id`/`role` onto token and session
- [ ] Type augmentation `src/types/next-auth.d.ts`
- [ ] `POST /api/auth/register` — zod + bcrypt + 409 conflict + rate limit (Project 6 pattern)
- [ ] Server guards: `requireUser()`, `requireAdmin()`, `requireOrderOwner(id)` throwing `AuthError`
- [ ] Providers: Session, Query, Toast (copied pattern from Project 6)
- [ ] `/signin` and `/signup` pages (Suspense-wrapped `useSearchParams`)
- [ ] Header shows Sign in / Account menu based on session

---

## Phase 3 — Product Catalog & Media

- [ ] Copy the pluggable storage layer from Project 6 (`src/lib/storage/` — Cloudinary/S3 behind one interface)
- [ ] `POST /api/products` (ADMIN) — zod, slugify w/ uniqueness, sanitize description HTML, create `Inventory` row, attach `ProductImage[]`
- [ ] `PATCH/DELETE /api/products/[id]` (ADMIN) — delete archives product (never hard-delete orders' references)
- [ ] `GET /api/products` — public: `q`, `categoryId`, `minPrice`, `maxPrice`, `sort` (newest|price_asc|price_desc|rating), cursor pagination, ACTIVE only
- [ ] `GET /api/products/[slug]` — public (DRAFT → 404 for non-admins); includes images, category, inventory availability, PUBLISHED reviews
- [ ] `GET /api/categories` public; `POST/PATCH/DELETE` ADMIN
- [ ] Media upload route `/api/media` (reuse) + `MediaPicker` component
- [ ] Category + product slug pages render from these APIs

---

## Phase 4 — Shopping Cart

- [ ] `CartProvider` — guest cart in `localStorage` (`{ productId, quantity }[]`); server cart when signed-in
- [ ] Merge guest cart into DB cart on first sign-in (`POST /api/cart/merge`)
- [ ] `GET /api/cart` — items with product name/slug/price/image + per-line stock availability
- [ ] `POST /api/cart/items` — validate quantity ≥ 1 and ≤ inventory; upsert via unique key
- [ ] `PATCH /api/cart/items/[id]`, `DELETE /api/cart/items/[id]`, `DELETE /api/cart`
- [ ] Cart page: line items, qty steppers, remove, subtotal, "stock limited" warnings
- [ ] Header cart badge with total quantity

## Phase 5 — Checkout & Payments

- [ ] Shipping address handling: `Address` CRUD API + account addresses page; default address
- [ ] `POST /api/checkout/session` inside `prisma.$transaction`:
  - [ ] recompute subtotal from current product prices (never trust client)
  - [ ] per item: conditional `updateMany` decrement of `Inventory.quantityOnHand` (`WHERE quantityOnHand >= n`) — abort → `409 OUT_OF_STOCK`
  - [ ] create `Order` (PENDING) with human `number` + address snapshot + `OrderItem`s (price snapshots)
  - [ ] create `Payment` row (PENDING)
- [ ] Stripe Checkout Session creation (`mode: "payment"`, line items in cents, `metadata.orderId`, success/cancel URLs)
- [ ] Checkout page: address selection, order summary, shipping cost, "Pay with Stripe" → redirect
- [ ] `/checkout/success` page reads `session_id`, polls order status until webhook lands
- [ ] Handle checkout cancel/expiry: order CANCELLED + inventory restored (Phase 6 webhook, but UI shows cancelled state)

## Phase 6 — Webhooks & Email

- [ ] `POST /api/webhooks/stripe` — read raw body, verify `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`
- [ ] `WebhookEvent` idempotency: insert-first (unique eventId) → skip if already processed
- [ ] `checkout.session.completed` → order PAID (`paidAt`), Payment SUCCEEDED + `paymentIntentId`, send confirmation email
- [ ] `checkout.session.expired` → order CANCELLED, restock inventory (reverse increments)
- [ ] `charge.refunded` → order REFUNDED, Payment REFUNDED, restock
- [ ] Email service (`src/lib/email.ts` — Resend) + `order-confirmation` template; `EmailLog` row per send; skip gracefully when unconfigured
- [ ] Local webhook testing with `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Phase 7 — Wishlist & Reviews

- [ ] Wishlist toggle API (`POST/DELETE /api/wishlist/[productId]`) + wishlist page + heart button
- [ ] `POST /api/products/[id]/reviews` — signed-in, **verified purchase check** (PAID/DELIVERED order containing the product), 1 review per user/product (409 on repeat), rating 1–5
- [ ] Recompute `Product.avgRating` + `reviewCount` in the same transaction
- [ ] Review list on product detail (PUBLISHED only) + "write a review" CTA gated on purchase
- [ ] `PATCH/DELETE /api/reviews/[id]` — author or ADMIN; aggregates updated
- [ ] Admin moderation: HIDDEN reviews excluded from public list + aggregates

## Phase 8 — Storefront Pages

- [ ] `(public)` layout + navbar (search, cart badge, account menu) + footer
- [ ] Home: hero, featured rail, new arrivals, category tiles
- [ ] `/products`: debounced search, category/price filters, sort dropdown, cursor pagination, empty/loading states
- [ ] `/products/[slug]`: image gallery, price (+compare-at), stock indicator, add-to-cart, wishlist, reviews, related products, `generateMetadata`
- [ ] `/categories/[slug]`
- [ ] `/cart`, `/checkout/success`
- [ ] `/wishlist`
- [ ] `/account`: profile, addresses, orders list (status badges), order detail (items, totals, status timeline)
- [ ] `loading.tsx` skeletons on every public segment (Project 6 pattern)

## Phase 9 — Admin Dashboard

- [ ] `(admin)` layout with ADMIN guard (`requireAdmin()` server-side + client sidebar hidden otherwise)
- [ ] Sales dashboard: revenue (PAID+), orders count, AOV, low-stock alerts, top products, 30-day revenue series (chart)
- [ ] Products table (search/status filter) + create/edit forms (images via MediaPicker, price in cents, category, featured, DRAFT/ACTIVE/ARCHIVED)
- [ ] Inventory page: adjust stock (delta or absolute), low-stock highlighting, `GET/PATCH /api/admin/inventory`
- [ ] Orders: table with status filter + detail page; status transitions (PAID → PROCESSING → SHIPPED → DELIVERED; CANCELLED; REFUNDED) enforced server-side by a status-machine helper
- [ ] Customers: list with order count + lifetime value
- [ ] Reviews moderation: hide/restore

## Phase 10 — Testing & Security

- [ ] Vitest unit tests: money format/parse, cart quantity validation, order status machine, slug uniqueness helper, webhook idempotency logic, checkout total computation
- [ ] Oversell test: fire two parallel checkouts against stock=1 → exactly one succeeds, other 409
- [ ] Smoke script `scripts/smoke.sh`: register → browse → add to cart → checkout (Stripe test flow) → webhook → order PAID → review appears → admin transitions status
- [ ] RBAC smoke: CUSTOMER gets 403 on all `/api/admin/*` and product writes
- [ ] Security review: webhook signature rejection (bad signature → 400), server-side totals (tampered client payload ignored), same-origin + rate limits, ownership checks

## Phase 11 — CI/CD & Deployment

- [ ] GitHub Actions `.github/workflows/ci.yml` — on PR + main: install → lint → type-check → test → build
- [ ] Status badge in README; branch protection requiring green CI
- [ ] Optional: `Dockerfile` + `docker-compose.yml` (app + local Postgres) for containerized dev
- [ ] Push to GitHub; import to Vercel; set all env vars (rotate `NEXTAUTH_SECRET`)
- [ ] Stripe: add production webhook endpoint (`/api/webhooks/stripe`) → copy signing secret to Vercel
- [ ] Resend: verify sending domain, update `EMAIL_FROM`
- [ ] Smoke-test production URL end-to-end with Stripe test cards
- [ ] (Stretch) Switch Stripe to live keys

## Phase 12 — Documentation & Portfolio

- [ ] `README.md` — 17-section template (Problem → Scaling Strategy), incl. payment sequence diagram + ER diagram
- [ ] `tasks-progress.md` kept in sync; final "BUILD PASSING" status line
- [ ] `docs/architecture.svg` — storefront + admin + Stripe/webhook flow
- [ ] `docs/ER-diagram.svg` (dbdiagram.io export)
- [ ] 30-second demo GIF: browse → add to cart → Stripe test pay → confirmation email → admin dashboard
- [ ] Record trade-offs table (Stripe Checkout vs Elements, snapshot pricing, conditional-update locking, guest cart)

---

## Done When

- [ ] All Phase 1–12 checkboxes ticked
- [ ] `npm run build`, `tsc --noEmit`, `eslint` all clean
- [ ] `npm test` green (incl. oversell concurrency test)
- [ ] Deployed to Vercel, reachable at a public URL, Stripe webhooks verified live
- [ ] README links live demo + screenshots; GitHub repo public and CI green
