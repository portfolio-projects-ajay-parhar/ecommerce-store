# Phase 9 — Admin Dashboard

## Goals
An ADMIN-only back office: sales KPIs, product/inventory management, order operations, customer list, review moderation.

## Steps

### 9.1 Layout & guard
- `(admin)/layout.tsx` — server-side `requireAdmin()` (redirect non-admins to `/`) + sidebar (Dashboard, Products, Inventory, Orders, Customers, Reviews)
- Reuse Project 6 dashboard components (Sidebar, KPI cards, tables, StatusBadge, ConfirmDialog)

### 9.2 Sales dashboard `/admin`
- `GET /api/admin/stats` returns:
  - revenue (Σ totalCents where status PAID/PROCESSING/SHIPPED/DELIVERED)
  - orders count by status, AOV, customer count
  - low-stock list (`Inventory.quantityOnHand <= lowStockThreshold`, ACTIVE products)
  - top 5 products by units sold (`OrderItem.groupBy`)
  - revenue by day, last 30 days (raw SQL `date_trunc` group-by)
- KPI cards + simple bar/line chart (no heavy chart lib — SVG or a tiny sparkline; a chart lib is a stretch goal)

### 9.3 Products management `/admin/products`
- Table: image, name, price, category, status, stock, actions (edit, archive)
- Status filter + search
- Create `/admin/products/new` + edit `/admin/products/[id]/edit`:
  - form: name, category, price (money input → cents), compare-at, description (TipTap or textarea+sanitizer — TipTap reuses Project 6's `RichEditor`), featured toggle, status
  - images: `MediaPicker` multi-upload with drag-to-reorder (sortOrder)
  - inventory block: sku, quantityOnHand, lowStockThreshold
- zod + `react-hook-form`; optimistic toasts

### 9.4 Inventory `/admin/inventory`
- Table of ACTIVE products with editable stock + threshold
- `PATCH /api/admin/inventory/[productId]` — absolute set or delta adjustment (`{ delta: -2 }`); floor at 0; `sku` immutable (it's on orders' audit trail)
- Low-stock rows highlighted; direct link to product edit

### 9.5 Orders `/admin/orders` + `/admin/orders/[id]`
- Table: number, customer, items count, total, payment status, order status, placedAt; filter by status
- Detail: customer + shipping snapshot, line items (with snapshots), payment record, full status timeline
- Status transitions via `PATCH /api/orders/[id]` (ADMIN branch) — must pass `assertTransition` (PENDING→PAID only via webhook; PROCESSING→SHIPPED→DELIVERED via admin; CANCELLED only from PENDING; REFUNDED from PAID/PROCESSING)
- Cancel/Refund buttons where legal (refund triggers Stripe `refunds.create` → webhook closes the loop)

### 9.6 Customers `/admin/customers`
- `GET /api/admin/customers` — users with `role CUSTOMER`, order count, lifetime value (Σ paid orders), last order date; search by email/name; never expose password hashes

### 9.7 Reviews moderation `/admin/reviews`
- All reviews with product + reviewer; hide/restore (`PATCH /api/admin/reviews/[id]`); deleting recomputes aggregates (Phase 7 logic)

## Done When
- CUSTOMER session hitting any `/admin` page redirects; all `/api/admin/*` return 403
- Product created from the form appears on the storefront immediately (ACTIVE) with images and stock
- Stock adjust then storefront purchase reflects the new quantity
- ADMIN can move a PAID order PROCESSING → SHIPPED → DELIVERED and see the timeline
- Illegal transition attempt returns 422
- Low-stock product shows on the dashboard and stays highlighted until restocked