# Phase 1 — Project Setup & Database

## Goals
1. Scaffold a fresh Next.js 16 app with TypeScript and Tailwind v4
2. Configure env vars for Supabase Postgres + Stripe + Resend + media storage
3. Design and migrate the **complete commerce schema** (10+ models)
4. Seed a realistic store catalog
5. Set up money helpers and base layout

## Steps

### 1.1 Scaffold
```bash
npx create-next-app@latest ecommerce-store \
  --typescript --tailwind --eslint --app --src-dir
cd ecommerce-store
```

### 1.2 Install dependencies
```bash
npm install prisma @prisma/client
npm install @tanstack/react-query axios
npm install next-auth @auth/prisma-adapter bcryptjs
npm install stripe
npm install zod react-hook-form @hookform/resolvers
npm install resend date-fns slugify image-size lucide-react
# plus the storage provider chosen (cloudinary and/or @aws-sdk/client-s3)
npm install -D @types/bcryptjs tsx vitest
```

### 1.3 Environment variables (.env.local)
```env
DATABASE_URL="postgres://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgres://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"

NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"

STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
# STRIPE_WEBHOOK_SECRET is filled in during Phase 6

RESEND_API_KEY="re_..."
EMAIL_FROM="orders@yourdomain.dev"

STORAGE_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="..." CLOUDINARY_API_KEY="..." CLOUDINARY_API_SECRET="..."
```
Also create `.env.example` mirroring all of the above with placeholders.

### 1.4 Prisma schema (prisma/schema.prisma)
Full model list (see PLAN.md §Database Schema for fields and indexes):
- NextAuth: `Account`, `Session`, `User`, `VerificationToken`
- `User` additions: `role` enum `CUSTOMER | ADMIN` (default CUSTOMER), `phone?`
- `Address`, `Category`, `Product`, `ProductImage`, `Inventory`
- `Cart`, `CartItem`, `Order`, `OrderItem`, `Payment`
- `Review`, `WishlistItem`, `WebhookEvent`, `EmailLog`
- Enums: `Role`, `ProductStatus` (DRAFT|ACTIVE|ARCHIVED), `OrderStatus`
  (PENDING|PAID|PROCESSING|SHIPPED|DELIVERED|CANCELLED|REFUNDED),
  `PaymentStatus` (PENDING|SUCCEEDED|FAILED|REFUNDED), `PaymentProvider` (STRIPE),
  `ReviewStatus` (PUBLISHED|HIDDEN)

Critical details:
- **All money fields are `Int` cents** (`priceCents`, `subtotalCents`, `totalCents`, …) — never `Float`.
- `Order` carries a **shipping snapshot** (flat fields, not a relation) so edits/deletes of `Address` don't mutate orders.
- `OrderItem` snapshots `productName`, `productSlug`, `unitPriceCents`.
- `Inventory` is a separate 1:1 model with `sku` (unique) + `lowStockThreshold`.
- `WebhookEvent.eventId` UNIQUE — webhook idempotency.

### 1.5 Migrate
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 1.6 Prisma client (src/lib/prisma.ts)
Copy the singleton from Project 6 verbatim.

### 1.7 Seed (prisma/seed.ts)
- bcrypt `Password123!` for all users: 1 ADMIN (`admin@shop.dev`) + 5 CUSTOMERs
- 6 categories (e.g. Electronics, Apparel, Home, Fitness, Books, Accessories)
- 24 products: distinct prices in cents, 1–3 images each (picsum/unsplash URLs fine), one with `compareAtPriceCents`, 2 marked `featured`
- `Inventory` per product; **set one product stock = 1** and **two products stock = 0** — these are needed for the oversell/out-of-stock tests in Phase 10

Add `"prisma": { "seed": "tsx prisma/seed.ts" }` to `package.json`, then `npm run db:seed`.

### 1.8 Money helpers (src/lib/money.ts)
```ts
export const formatMoney = (cents: number, locale = "en-US") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "USD" })
    .format(cents / 100);

export const parseMoneyToCents = (input: string): number => {
  const n = Number(input.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error("invalid amount");
  return Math.round(n * 100);
};
```

### 1.9 Config & base layout
- `next.config.ts` — `images.remotePatterns` for the storage provider host + picsum/unsplash
- `src/app/layout.tsx` (fonts, Providers wrapper placeholder), `globals.css`
- Root `page.tsx` placeholder (replaced in Phase 8)

## Done When
- `npx prisma migrate status` clean; `npm run db:seed` succeeds
- `npm run dev` boots; `npx prisma studio` shows all tables populated
- Unit test for `formatMoney`/`parseMoneyToCents` added and passing (starts the Vitest suite early)