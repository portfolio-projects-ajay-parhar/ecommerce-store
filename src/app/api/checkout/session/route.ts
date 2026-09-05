import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse, OutOfStockError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getRazorpay,
  razorpayConfigured,
  razorpayKeyId,
  RAZORPAY_CURRENCY,
} from "@/lib/razorpay";
import { createCheckoutOrder } from "@/lib/checkout";
import { cancelPendingOrder } from "@/lib/payments";
import { getOrCreateCart, loadCartWithItems } from "@/lib/cart";

export const runtime = "nodejs";

/**
 * POST — the checkout transaction:
 *   1. load cart (ACTIVE products only) + validate stock
 *   2. conditional inventory decrements inside prisma.$transaction (no oversell)
 *   3. Order PENDING + snapshots + Payment PENDING + cart cleared
 *   then (outside the tx) a Razorpay Order; the client opens the Checkout
 *   modal and the signed success posts to /api/checkout/verify.
 */
export async function POST(req: NextRequest) {
  let orderId: string | null = null;
  try {
    assertSameOrigin(req);
    const user = await requireUser();

    const rl = checkRateLimit(`checkout:${user.id}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many checkout attempts. Try again shortly." },
        { status: 429 },
      );
    }

    const body = (await req.json()) as { addressId?: string };
    if (!body.addressId) {
      return NextResponse.json({ error: "A shipping address is required." }, { status: 400 });
    }

    const address = await prisma.address.findUnique({
      where: { id: body.addressId },
    });
    if (!address || address.userId !== user.id) {
      return NextResponse.json({ error: "Address not found." }, { status: 404 });
    }

    const cart = await getOrCreateCart(user.id);
    const loaded = await loadCartWithItems(cart.id);
    const cartItems = loaded?.items ?? [];

    if (cartItems.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // Server-side validation before the transaction (fast failure paths)
    for (const item of cartItems) {
      if (item.product.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "OUT_OF_STOCK", productId: item.productId, message: `${item.product.name} is no longer available.` },
          { status: 409 },
        );
      }
      const stock = item.product.inventory?.quantityOnHand ?? 0;
      if (item.quantity > stock) {
        return NextResponse.json(
          { error: "OUT_OF_STOCK", productId: item.productId, message: `Only ${stock} left of ${item.product.name}.` },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      return createCheckoutOrder(tx, {
        userId: user.id,
        cartId: cart.id,
        address: {
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
        lines: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          name: item.product.name,
          slug: item.product.slug,
          unitPriceCents: item.product.priceCents,
          stock: item.product.inventory?.quantityOnHand ?? 0,
        })),
      });
    });
    orderId = result.orderId;

    // ── Razorpay Order (outside the DB transaction) ──
    if (!razorpayConfigured()) {
      // Dev/test fallback: no Razorpay keys → keep the PENDING order and tell
      // the client. The order can be cancelled/restocked or paid again later.
      return NextResponse.json(
        {
          error: "Razorpay is not configured on the server — order created but payment unavailable.",
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          razorpayOrderId: null,
        },
        { status: 503 },
      );
    }

    const rzpOrder = await getRazorpay().orders.create({
      // Integer minor units (paise) — mirrors the server-side total exactly
      amount: result.totals.totalCents,
      currency: RAZORPAY_CURRENCY,
      receipt: result.orderNumber,
      notes: { orderId: result.orderId, orderNumber: result.orderNumber },
    });

    await prisma.order.update({
      where: { id: result.orderId },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return NextResponse.json({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: razorpayKeyId(),
    });
  } catch (e) {
    // The transaction aborted atomically — nothing to clean up.
    if (e instanceof OutOfStockError) {
      return errorResponse(e);
    }
    // Razorpay order creation failed AFTER the order committed: cancel + restock.
    if (orderId) {
      await cancelPendingOrder(orderId).catch(() => undefined);
    }
    return errorResponse(e);
  }
}
