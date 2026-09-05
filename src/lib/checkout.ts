import type { OrderStatus, Prisma } from "@prisma/client";
import { computeShippingCents } from "./money";
import { nextOrderNumber } from "./order-number";
import { OutOfStockError } from "./api";

// ── Pure computation (unit-tested) ──────────────────────────────────────────

export interface PricedLine {
  productId: string;
  quantity: number;
}

export interface Totals {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

/** Recomputes order totals from server-side (DB) prices — never trusts the client. */
export function computeTotals(
  lines: { unitPriceCents: number; quantity: number }[],
): Totals {
  const subtotalCents = lines.reduce(
    (sum, l) => sum + l.unitPriceCents * l.quantity,
    0,
  );
  const shippingCents =
    lines.length === 0 ? 0 : computeShippingCents(subtotalCents);
  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
  };
}

/** First line whose quantity exceeds available stock (null = all fine). */
export function findOverstockLine(
  lines: { productId: string; quantity: number; stock: number }[],
): { productId: string; quantity: number; stock: number } | null {
  return lines.find((l) => l.quantity > l.stock) ?? null;
}

// ── The transactional checkout core ─────────────────────────────────────────

export interface CheckoutCartLine {
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  unitPriceCents: number;
  stock: number;
}

export interface CheckoutAddressSnapshot {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  totals: Totals;
}

/**
 * Creates the order + reserves stock atomically:
 *
 *  1. recompute totals from DB prices (client amounts never trusted)
 *  2. conditional inventory decrement per line — `WHERE quantityOnHand >= n`
 *     via updateMany; a zero-count update aborts the WHOLE transaction
 *     (no oversell, no partial orders)
 *  3. Order (PENDING) + human number + address snapshot + OrderItem snapshots
 *  4. Payment row (PENDING)
 *  5. cart cleared
 *
 * The Razorpay Order is created OUTSIDE the tx by the caller — if order
 * creation fails, the caller cancels the order and restocks.
 */
export async function createCheckoutOrder(
  tx: Prisma.TransactionClient,
  opts: {
    userId: string;
    cartId: string;
    lines: CheckoutCartLine[];
    address: CheckoutAddressSnapshot;
  },
): Promise<CheckoutResult> {
  const { userId, cartId, lines, address } = opts;

  if (lines.length === 0) {
    throw new OutOfStockError("", "Your cart is empty");
  }

  // Server-side totals from DB prices
  const totals = computeTotals(
    lines.map((l) => ({ unitPriceCents: l.unitPriceCents, quantity: l.quantity })),
  );

  // 1) Reserve stock — conditional decrement, the oversell guard
  for (const line of lines) {
    const res = await tx.inventory.updateMany({
      where: {
        productId: line.productId,
        quantityOnHand: { gte: line.quantity },
      },
      data: { quantityOnHand: { decrement: line.quantity } },
    });
    if (res.count === 0) {
      throw new OutOfStockError(line.productId, `Only ${line.stock} left in stock`);
    }
  }

  // 2) Order + snapshots
  const number = await nextOrderNumber(tx);
  const order = await tx.order.create({
    data: {
      number,
      userId,
      status: "PENDING",
      subtotalCents: totals.subtotalCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      shippingName: address.fullName,
      shippingLine1: address.line1,
      shippingLine2: address.line2 ?? null,
      shippingCity: address.city,
      shippingState: address.state ?? null,
      shippingPostalCode: address.postalCode,
      shippingCountry: address.country,
      shippingPhone: address.phone ?? null,
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          productName: l.name,
          productSlug: l.slug,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          lineTotalCents: l.unitPriceCents * l.quantity,
        })),
      },
      payment: {
        create: {
          provider: "RAZORPAY",
          amountCents: totals.totalCents,
          status: "PENDING",
        },
      },
    },
    select: { id: true, number: true },
  });

  // 3) Empty the cart
  await tx.cartItem.deleteMany({ where: { cartId } });

  return { orderId: order.id, orderNumber: order.number, totals };
}

/**
 * Reverse of the checkout decrement — used when a session expires, the order
 * is cancelled pre-payment, or a charge is refunded.
 */
export async function restockOrderItems(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (!item.productId) continue;
    await tx.inventory
      .updateMany({
        where: { productId: item.productId },
        data: { quantityOnHand: { increment: item.quantity } },
      })
      .catch(() => undefined); // product deleted → nothing to restock
  }
}

/** Applies the webhook-driven status change with the timestamp bookkeeping. */
export function statusTimestampField(status: OrderStatus): Record<string, Date> {
  switch (status) {
    case "PAID":
      return { paidAt: new Date() };
    case "SHIPPED":
      return { shippedAt: new Date() };
    case "DELIVERED":
      return { deliveredAt: new Date() };
    case "CANCELLED":
      return { cancelledAt: new Date() };
    default:
      return {};
  }
}
