# Phase 3 — Product Catalog & Media

## Goals
1. Reuse the pluggable media storage layer from Project 6 (Cloudinary | S3 behind one interface)
2. Admin CRUD for categories and products (with images + inventory rows)
3. Public catalog APIs: search, filters, sort, cursor pagination
4. Product detail data for the storefront

## Steps

### 3.1 Port the storage layer
- Copy `src/lib/storage/` (types, shared helpers, `providers/cloudinary.ts`, `providers/s3.ts`, index) from `blog-cms-platform`
- Copy `/api/media` routes + `MediaPicker` component + `useMedia` hook unchanged — they are already provider-agnostic

### 3.2 Product write APIs (ADMIN)
- `POST /api/products`
  - zod: name 1–120, priceCents int > 0, description ≤ 20k, category exists, images 1–6 `{ url, alt?, sortOrder }`, `inventory: { sku, quantityOnHand, lowStockThreshold? }`
  - slugify name + `ensureUniqueSlug` walking (`-2`, `-3`, …)
  - sanitize `description` HTML on write (Project 6 sanitizer)
  - create `Product` + `ProductImage[]` + `Inventory` in one transaction
  - status defaults DRAFT; `featured` only settable by ADMIN (only role anyway)
- `PATCH /api/products/[id]` — partial update; re-slug only if name changes; re-sanitize on description change; update inventory row if provided
- `DELETE /api/products/[id]` — **archive** (status ARCHIVED) instead of hard delete; hard delete allowed only if no `OrderItem` references it

### 3.3 Public catalog APIs
- `GET /api/products?` params:
  - `q` (name/description contains, case-insensitive)
  - `categoryId`, `minPrice`, `maxPrice` (cents)
  - `sort` = `newest` (default) | `price_asc` | `price_desc` | `rating`
  - `cursor`, `take` (default 12, max 48)
  - **ACTIVE only** for everyone; response `{ items, nextCursor }`
- `GET /api/products/[slug]` — ACTIVE public; DRAFT/ARCHIVED → 404 unless ADMIN. Include images, category, `Inventory` (expose only `available: boolean` + `quantityOnHand`), PUBLISHED reviews summary.

### 3.4 Category APIs
- `GET /api/categories` — public, ACTIVE categories only
- `POST /api/categories` — ADMIN (name, description?, imageUrl?); unique slug
- `PATCH/DELETE /api/categories/[id]` — ADMIN; delete only when empty (or `isActive: false`)

### 3.5 Admin product form (UI-ready data)
- Build the form in Phase 9; here just make sure APIs return everything it needs
- `ProductImage` rows honor `sortOrder` — gallery order is data-driven

## Done When
- `curl` a fresh ADMIN session through POST → PATCH → DELETE-archive of a product without errors
- Anon `GET /api/products` never returns DRAFT/ARCHIVED products
- Price filters + all four sort modes verified against seeded data
- Two products with the same name get `-2` slug
- DRAFT product 404s for anon on `/api/products/[slug]`