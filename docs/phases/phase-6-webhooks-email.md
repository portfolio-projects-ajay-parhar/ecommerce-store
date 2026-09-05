# Phase 6 — Webhooks & Email

## Goals
1. Stripe webhook endpoint with **signature verification**
2. **Idempotent** processing via the `WebhookEvent` table
3. Order lifecycle transitions driven by webhook events
4. Order-confirmation email via Resend (+ `EmailLog`)

## Steps

### 6.1 Webhook route (src/app/api/webhooks/stripe/route.ts)
```ts
const sig = req.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(await req.text(), sig, STRIPE_WEBHOOK_SECRET);
```
- Must read the **raw body** (`req.text()`), not parsed JSON
- Bad/missing signature → `400` immediately
- `export const runtime = "nodejs"` (signature verification needs the Node SDK)

### 6.2 Idempotency (src/lib/webhooks.ts)
```ts
const claim = await prisma.webhookEvent.create({ data: { eventId: event.id, type: event.type, payload: event.data.object } }).catch(() => null);
if (!claim) return NextResponse.json({ received: true, duplicate: true }); // replay → no-op
```
Process in a try/catch; on failure, delete the claim row so Stripe's retry can reprocess.

### 6.3 Event handlers
- **`checkout.session.completed`**
  - find order by `stripeSessionId` (skip if none — foreign events)
  - `Order → PAID` (`paidAt`), `Payment → SUCCEEDED` + `stripePaymentIntentId` from `session.payment_intent`
  - send confirmation email (6.4)
- **`checkout.session.expired`** → order (if still PENDING) → `CANCELLED`, **restock**: increment `Inventory` back by each OrderItem quantity, cancel Payment
- **`charge.refunded`** → order → `REFUNDED`, Payment → REFUNDED, restock
- Unknown types → `{ received: true }` (200 — never 500 on unhandled events or Stripe will retry forever)

### 6.4 Email service (src/lib/email.ts)
- Resend client; `sendOrderConfirmation(order)` renders a simple HTML template (order number, items, totals, tracking link placeholder)
- Insert `EmailLog` row per attempt (SENT/FAILED/SKIPPED)
- If `RESEND_API_KEY` is unset → SKIPPED + console.info (dev-friendly, and the E2E suite stays green without email)
- Failure to send must **not** fail the webhook — log, return 200, rely on the EmailLog for observability

### 6.5 Local webhook testing
```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the whsec_... into .env.local as STRIPE_WEBHOOK_SECRET, restart dev server
```
- Pay with `4242 4242 4242 4242` → watch `checkout.session.completed` hit the route → order flips to PAID
- Replay the same event (`stripe trigger` or re-send from the dashboard) → `duplicate: true`, no state change
- Let a Checkout session expire → order CANCELLED + stock restored

### 6.6 Order status machine (src/lib/order-status.ts)
```ts
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PROCESSING: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [], REFUNDED: [],
};
assertTransition(from, to) // throws on illegal moves
```
Used by both webhook handlers and the admin PATCH route (Phase 9). Unit-test it.

## Done When
- Webhook with a bad signature returns 400 (verify with curl)
- Payment → order PAID → confirmation email arrives (or SKIPPED log in dev)
- Replayed event leaves state untouched
- Expired session cancels the order and restores inventory exactly
- Illegal status transition (e.g. DELIVERED → PAID) throws in a unit test