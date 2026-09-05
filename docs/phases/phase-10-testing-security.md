# Phase 10 — Testing & Security

## Goals
Prove the commerce-critical logic: money math, the oversell guard, the status machine, and webhook idempotency — plus a scripted end-to-end smoke of the happy path.

## Steps

### 10.1 Unit tests (Vitest)
| File | Cases |
|---|---|
| `src/lib/__tests__/money.test.ts` | `formatMoney(1999) === "$19.99"`; rounding in `parseMoneyToCents`; rejects negatives/NaN |
| `src/lib/__tests__/order-number.test.ts` | format, uniqueness across rapid calls (mock) |
| `src/lib/__tests__/order-status.test.ts` | every legal transition passes; every illegal one throws |
| `src/lib/__tests__/purchase.test.ts` | hasPurchased true only for PAID+ statuses; false for PENDING/CANCELLED/REFUNDED |
| `src/lib/__tests__/webhooks.test.ts` | claim-first idempotency (second create → null → duplicate); failed processing releases the claim |
| `src/lib/__tests__/checkout.test.ts` | subtotal/shipping/total computation; over-quantity detection |

### 10.2 Oversell concurrency test
`scripts/oversell-test.mjs` (tsx or vitest integration file):
1. Seed product with `quantityOnHand = 1`
2. Fire `POST /api/checkout/session` twice in parallel (two user sessions)
3. Assert: exactly one `200` (order PENDING + stock 0), one `409 OUT_OF_STOCK`
4. Assert inventory row is exactly 0 — never -1
Run against the dev server like the Project 6 smoke scripts.

### 10.3 Smoke script (scripts/smoke.sh)
Happy path via curl + cookie jars:
1. Register → sign in (CUSTOMER cookie jar)
2. Browse `GET /api/products`, pick an in-stock product
3. Add to cart ×2 → cart shows 2
4. Checkout session → order id; (with Stripe CLI forwarding, complete payment, or use a test helper that fires a signed `checkout.session.completed` fixture)
5. Webhook → order PAID
6. Review the product → 201; second review → 409; non-buyer review → 403
7. ADMIN: transition PAID → PROCESSING → SHIPPED → DELIVERED; illegal move → 422
8. RBAC: CUSTOMER hits `POST /api/products`, `PATCH /api/admin/inventory/...` → 403

### 10.4 Security checklist
- [ ] Webhook: unsigned/tampered request → 400; replayed event id → duplicate no-op
- [ ] Totals: tampered client payload (fake prices) ignored — server recomputes from DB
- [ ] `409 OUT_OF_STOCK` never decrements stock (transaction rollback verified)
- [ ] Ownership: another user's `GET /api/orders/[id]` → 404; cart item PATCH of foreign id → 404/403
- [ ] Rate limits active on register/checkout/reviews; same-origin on all mutations
- [ ] ADMIN-only fields (role, featured, price) not patchable through public routes
- [ ] `description` HTML sanitized on write + render (XSS vector test from Project 6 reused)

## Done When
- `npm test` green with all unit tests
- Oversell test passes deterministically (run it 3×)
- Smoke script prints all-green end to end
- Security checklist fully ticked with notes where behavior was verified manually