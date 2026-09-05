# E-Commerce Store Build — Progress Tracker

> Mirror of [`docs/TASKS.md`](./docs/TASKS.md). Tick boxes as each item completes. The "BUILD PASSING" line at the bottom is updated once `npm run build` runs clean.

## Status
**BUILD PASSING** — `next build` clean, `tsc --noEmit` clean, ESLint clean, Vitest 39/39, oversell concurrency test green, smoke script 12/12. Deployment (Phase 11 Vercel + production Stripe webhooks) and portfolio media (demo GIF/screenshots) remain user-driven steps requiring live accounts.

## Phase 1 — Setup & Database
- [x] Next.js scaffold (Next 16, TS, Tailwind v4, src dir)
- [x] Dependencies installed (Prisma 6, NextAuth v4, Stripe, Resend, TanStack Query, Zod, …)
- [x] `.env` / `.env.example` (local Docker Postgres on :5433; Supabase URLs documented for prod)
- [x] Prisma schema (15 models incl. MediaItem + 6 enums) + `init` migration applied
- [x] Singleton client (`src/lib/prisma.ts`)
- [x] Money helpers (`src/lib/money.ts` — formatMoney, parseMoneyToCents, shipping rule)
- [x] Seed data (1 admin, 5 customers, 6 categories, 27 products, incl. stock=1 and stock=0 items)
- [x] Next.js image config for the storage provider + picsum/unsplash

## Phase 2 — Auth & Roles
- [x] NextAuth options + handler (Credentials + Prisma adapter + JWT)
- [x] Register API (zod, bcrypt, 409, rate-limited 5/min/IP)
- [x] JWT/session callbacks (`id`/`role`)
- [x] Type augmentation + server guards (`requireUser`, `requireAdmin`, `requireOrderOwner` → 404)
- [x] Providers (Session, Query, Toast, Theme, Cart)
- [x] Sign-in / sign-up pages (Suspense-wrapped `useSearchParams`, demo credentials hint)

## Phase 3 — Product Catalog & Media
- [x] Storage layer ported from Project 6 (Cloudinary | S3 behind one interface)
- [x] Product CRUD APIs (ADMIN) — slugify + ensureUniqueSlug, sanitize on write, transactional create with inventory
- [x] Public catalog API (search, filters, sort, cursor pagination, ACTIVE only)
- [x] Product-by-slug API (DRAFT/ARCHIVED 404 for non-admins; cuid keys admin-only)
- [x] Category APIs (public read, admin write, delete only when empty)
- [x] Media routes + MediaPicker ported


## Phase 4 — Shopping Cart
- [x] CartProvider (guest localStorage + server cart + one-time merge on sign-in)
- [x] Cart APIs (get/add/update/remove/empty/merge/guest-hydration, inventory-validated, clamp-to-stock upsert)
- [x] Cart page with stock warnings + header badge (guest + signed-in modes)

## Phase 5 — Checkout & Payments
- [x] Address APIs + account addresses page (isDefault swap in a transaction)
- [x] Order number helper (`ORD-YYYY-NNNN`, collision-retry, unit-tested format)
- [x] `POST /api/checkout/session` — transaction with conditional inventory decrements (no oversell), order + snapshots + payment, cart cleared
- [x] Stripe Checkout Session creation + redirect (shipping mirrored server-side); dev fallback keeps PENDING order when Stripe unconfigured
- [x] Checkout page + `/checkout/success` polling; cancel toast on `/cart?cancelled=1`; "pay again" for PENDING orders

## Phase 6 — Webhooks & Email
- [x] `POST /api/webhooks/stripe` with signature verification (raw body; 400 on bad/missing/unconfigured)
- [x] WebhookEvent idempotency (claim-first; release claim on failure → retry reprocesses)
- [x] Handlers: completed → PAID + Payment SUCCEEDED + paymentIntentId, expired → CANCELLED + restock, refunded → REFUNDED + restock
- [x] Order status machine helper (`assertTransition`; 422 on illegal admin moves)
- [x] Resend email service + order-confirmation template + EmailLog (SKIPPED when unconfigured; failure never fails the webhook)
- [x] Stripe CLI forwarding documented (README); webhook path verified via unit tests + signature-rejection checks

## Phase 7 — Wishlist & Reviews
- [x] Wishlist APIs + toggle button + page (idempotent upsert/delete)
- [x] Verified-purchase check (`hasPurchased`, PAID+ statuses only) + review write API (aggregates recomputed in the same transaction, 403 non-buyer, 409 repeat)
- [x] Review read (cursor pagination) / patch (author or ADMIN) / delete + admin moderation (HIDDEN excluded from list + aggregates)


## Phase 8 — Storefront Pages
- [x] Public layout (navbar with search/wishlist/cart badge/account menu/theme toggle, footer)
- [x] Home (hero + search, category tiles, featured, new arrivals)
- [x] Products listing (search, category/price filters, sort, cursor pagination, empty states)
- [x] Product detail (gallery, compare-at, stock indicator, add-to-cart, wishlist, reviews, related, `generateMetadata` + OG image)
- [x] Category / cart / checkout / success / wishlist pages
- [x] Account (profile, addresses, orders list + detail with status timeline)
- [x] Loading skeletons + not-found + error pages

## Phase 9 — Admin Dashboard
- [x] Admin layout with server-side guard (redirects non-admins)
- [x] Sales dashboard (revenue, paid orders, AOV, customers, 30-day SVG revenue series, top products, low-stock alerts, orders by status)
- [x] Products table (search/status filter) + create/edit forms (MediaPicker, price→cents, featured, status)
- [x] Inventory page (±delta / absolute set, optimistic, low-stock highlighting, immutable SKU)
- [x] Orders table + detail + status transitions enforced by the status machine (422 illegal)
- [x] Customers list (orders count, LTV, last order)
- [x] Reviews moderation (hide/restore/delete)


## Phase 10 — Testing & Security
- [x] Vitest unit suite — 39 tests (money, order number, status machine, purchase check, webhook idempotency, checkout totals, slug)
- [x] Oversell concurrency test — `scripts/oversell-test.mjs`: 2 parallel checkouts, stock=1 → exactly one winner (503 dev / 200 with Stripe), one 409 OUT_OF_STOCK, inventory exactly 0
- [x] Smoke script — `scripts/smoke.sh`: register → browse → cart ×2 → checkout → webhook rejection → admin endpoints; 12/12 green
- [x] Security checklist (webhook signature 400, tampered totals ignored — server recomputes, ownership 404s, rate limits, same-origin, role not client-settable, sanitize write+render)

## Phase 11 — CI/CD & Deploy
- [x] GitHub Actions CI (`.github/workflows/ci.yml`): install → prisma generate → lint → type-check → test → build (placeholder DB URL; no build-time DB access)
- [x] README CI badge placeholder + branch-protection note
- [x] Dockerfile (multi-stage) + docker-compose.yml (app + postgres:16)
- [ ] GitHub push + Vercel deploy with all env vars *(requires user accounts)*
- [ ] Stripe production webhook endpoint configured *(requires Stripe account)*
- [ ] Production smoke passed *(post-deploy)*

## Phase 12 — Documentation & Portfolio
- [x] README.md with 17 sections (+ Getting Started & Scripts)
- [x] Architecture diagram (`docs/architecture.svg`)
- [x] ER diagram (`docs/ER-diagram.svg`)
- [ ] Demo GIF *(requires running app + screen capture; regenerate after deploy)*
- [x] Trade-offs table recorded (README §16)

---

**Status: BUILD PASSING** — `next build` clean · `tsc --noEmit` clean · ESLint clean · Vitest 39/39 · oversell test green · smoke 12/12 · storefront/admin pages render (200) · /admin redirects anon (307) · DRAFT/ARCHIVED products hidden · unsigned webhooks rejected (400)
