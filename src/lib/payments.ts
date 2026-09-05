import { prisma } from "@/lib/prisma";
import { restockOrderItems, statusTimestampField } from "@/lib/checkout";
import { assertTransition } from "@/lib/order-status";
import { sendOrderConfirmation } from "@/lib/email";

/**
 * Shared "payment succeeded" completion used by BOTH the client-side verify
 * route and the payment.captured webhook. Idempotent by status: an order that
 * is no longer PENDING is never re-transitioned or re-emailed.
 */
export async function completePaidOrder(
  orderId: string,
  providerRef: string | null,
): Promise<"paid" | "already_done" | "not_found"> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true, name: true } } },
  });
  if (!order) return "not_found";
  if (order.status !== "PENDING") return "already_done";

  assertTransition(order.status, "PAID");
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      razorpayPaymentId: providerRef,
      ...statusTimestampField("PAID"),
    },
    include: { items: true, user: { select: { email: true, name: true } } },
  });
  await prisma.payment.updateMany({
    where: { orderId: order.id },
    data: { status: "SUCCEEDED", providerRef },
  });

  // Email failure must not fail payment — sendOrderConfirmation logs it.
  await sendOrderConfirmation(prisma, updated);
  return "paid";
}

/**
 * Shared "payment/order cancelled" path: cancel the PENDING order, fail its
 * payment, and restock the reserved inventory.
 */
export async function cancelPendingOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING") return;

  await prisma.$transaction(async (tx) => {
    assertTransition(order.status, "CANCELLED");
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", ...statusTimestampField("CANCELLED") },
    });
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    await restockOrderItems(tx, order.id);
  });
}

/** Shared refund path: REFUNDED + restock (PAID/PROCESSING orders only). */
export async function refundOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.status !== "PAID" && order.status !== "PROCESSING") return;

  await prisma.$transaction(async (tx) => {
    assertTransition(order.status, "REFUNDED");
    await tx.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED" },
    });
    await tx.payment.updateMany({
      where: { orderId: order.id },
      data: { status: "REFUNDED" },
    });
    await restockOrderItems(tx, order.id);
  });
}
