# Phase 5 — Checkout & Payments

## Goals
1. Ship-to address handling with a reusable `Address` model
2. The **core of the project**: a checkout transaction that creates the order and reserves stock atomically
3. Stripe Checkout Session creation and redirect

## Steps

### 5.1 Addresses
- `GET/POST /api/addresses`, `PATCH/DELETE /api/addresses/[id]` — owner-only
- `isDefault` logic: setting a new default clears the old one (transaction)
- Account → Addresses page: list + add/edit form (zod: line1, city, postalCode, country required)

### 5.2 Order number helper (src/lib/order-number.ts)
`ORD-<YYYY>-<seq>` — derive seq from `countDocuments` of the year + random suffix collision retry, or a Postgres sequence. Keep it simple and unique; unit-test it.

### 5.3 Checkout session route (src/app/api/checkout/session/route.ts)
`requireUser()` + same-origin + rate limit (5/min). Body: `{ addressId }`.

Inside **one** `prisma.$transaction`:
1. Load the cart with items joined to `Product` (ACTIVE only) + `Inventory`
2. Empty cart → `400`; any over-quantity line → `409 OUT_OF_STOCK` up front
3. Compute `subtotalCents = Σ unitPriceCents × qty` **from DB prices**; `shippingCents` = flat rule (e.g. free over $50, else 599); `totalCents`
4. For **each** item, conditional decrement (the oversell guard):
   ```ts
   const res = await tx.inventory.updateMany({
     where: { productId: item.productId, quantityOnHand: { gte: item.quantity } },
     data: { quantityOnHand: { decrement: item.quantity } },
   });
   if (res.count === 0) throw new OutOfStockError(item.productId);
   ```
5. Create `Order` (status PENDING) + address snapshot + `OrderItem`s (name/slug/price snapshots, `lineTotalCents`)
6. Create `Payment` (PENDING, provider STRIPE)
7. **Clear the cart items**

Any throw aborts the whole transaction — stock is untouched.

Then (outside the tx): create the Stripe Checkout Session:
```ts
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: items.map(i => ({
    price_data: { currency: "usd", unit_amount: i.unitPriceCents,
                  product_data: { name: i.productName } },
    quantity: i.quantity,
  })),
  shipping_options: [...],          // mirror shippingCents
  metadata: { orderId: order.id },
  success_url: `${BASE}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE}/cart?cancelled=1`,
  customer_email: session.user.email,
});
```
Save `stripeSessionId` on the order; return `{ url: session.url }` → client redirects.

### 5.4 Checkout page (src/app/(public)/checkout/page.tsx)
- Address selection (radio list + "add new"), order summary (lines, subtotal, shipping, total)
- Pay button → `POST /api/checkout/session` → `window.location = url`
- Handle `409 OUT_OF_STOCK`: toast + badge the offending line + refresh cart

### 5.5 Success & cancel states
- `/checkout/success?session_id=...` — fetch order by session; if still PENDING, poll `GET /api/orders/[id]` every 3s up to ~30s (webhook usually lands in seconds), then show paid/processing state with order link
- `/cart?cancelled=1` — toast "Checkout cancelled"; order remains PENDING until the `expired` webhook cancels it (Phase 6)

## Done When
- Happy path: checkout → Stripe test page (`4242 4242 4242 4242`) → returns to success; order exists as PENDING
- Order + OrderItems created with correct **snapshots** (rename a product, old orders unchanged)
- Stock decremented by exact quantities inside the transaction
- Cart emptied after successful session creation
- `4242…0002` (declined) → no order state change beyond PENDING; webhook path in Phase 6 handles it
- Out-of-stock product in cart blocks checkout with a clear UI message