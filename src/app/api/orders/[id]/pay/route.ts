import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrderOwner, requireUser, AuthError } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import {
  getRazorpay,
  razorpayConfigured,
  razorpayKeyId,
  RAZORPAY_CURRENCY,
} from "@/lib/razorpay";

type Params = { params: Promise<{ id: string }> };

/**
 * POST — "Pay again": create a Razorpay Order for a PENDING order.
 * Uses the order's snapshot total so the charged amount always equals
 * order.totalCents (shipping already folded in).
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    const { order } = await requireOrderOwner((await params).id);

    if (order.status !== "PENDING") {
      throw new AuthError(409, "Only pending orders can be paid.");
    }
    if (!razorpayConfigured()) {
      return NextResponse.json(
        { error: "Razorpay is not configured on the server." },
        { status: 503 },
      );
    }

    const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
    if (items.length === 0) {
      throw new AuthError(409, "Order has no line items.");
    }

    await requireUser();

    const rzpOrder = await getRazorpay().orders.create({
      amount: order.totalCents,
      currency: RAZORPAY_CURRENCY,
      receipt: order.number,
      notes: { orderId: order.id, orderNumber: order.number },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: rzpOrder.id },
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: razorpayKeyId(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
