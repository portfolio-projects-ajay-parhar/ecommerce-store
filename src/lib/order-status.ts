import type { OrderStatus } from "@prisma/client";
import { IllegalTransitionError } from "./api";

/**
 * The single source of truth for the order lifecycle. Used by the Razorpay
 * webhook/verify handlers and the admin status transition route.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PROCESSING: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throws IllegalTransitionError (→ HTTP 422) on illegal moves. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}

/** Statuses that count as revenue (paid orders in any active state). */
export const REVENUE_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

/** Statuses that qualify a purchase as "verified" for reviews. */
export const VERIFIED_PURCHASE_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];
