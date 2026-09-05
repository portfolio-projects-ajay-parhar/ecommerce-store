import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { completePaidOrder } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST — verify a Razorpay Checkout success callback.
 * Razorpay hands the client `razorpay_order_id`, `razorpay_payment_id` and
 * `razorpay_signature` (HMAC-SHA256 of `orderId|paymentId` with the key
 * secret). We verify in constant time, confirm the order belongs to the
 * caller, and mark it PAID. The payment.captured webhook is the belt to this
 * suspenders — both paths are idempotent via the order status.
 */
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();

    const rl = checkRateLimit(`razorpay-verify:${user.id}`, 10, 60_000);
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
    }

    const body = (await req.json()) as {
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    };
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, userId: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    // Only the owner may complete payment on this order.
    if (order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status !== "PENDING") {
      return NextResponse.json({ orderId: order.id, status: order.status });
    }

    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    const outcome = await completePaidOrder(order.id, razorpayPaymentId);
    if (outcome === "not_found") {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const finalOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true, number: true, status: true },
    });
    return NextResponse.json({ orderId: finalOrder?.id, status: finalOrder?.status });
  } catch (e) {
    return errorResponse(e);
  }
}
