import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { razorpayConfigured, verifyWebhookSignature } from "@/lib/razorpay";
import { claimWebhookEvent, releaseWebhookEvent } from "@/lib/webhooks";
import {
  completePaidOrder,
  refundOrder,
} from "@/lib/payments";

export const runtime = "nodejs";

/**
 * POST — Razorpay webhook with signature verification + idempotency.
 * - Raw body (req.text()) is required for HMAC verification against
 *   `x-razorpay-signature`.
 * - Bad/missing signature → 400.
 * - Event id claim-first insert (WebhookEvent) → replays are no-ops.
 * - Unknown events → 200 (never 500, or Razorpay retries forever).
 *
 * Configure events: payment.captured, payment.failed, refund.processed.
 */
export async function POST(req: NextRequest) {
  // Unconfigured webhooks can't verify signatures — reject rather than 500.
  if (!razorpayConfigured() || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Razorpay webhooks are not configured on the server." },
      { status: 400 },
    );
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!signature || !verifyWebhookSignature(raw, signature)) {
    console.error("[razorpay-webhook] signature verification failed");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(raw) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  if (!event.event) {
    return NextResponse.json({ error: "Missing event type." }, { status: 400 });
  }

  // Idempotency: INSERT-first claim; a duplicate event id short-circuits.
  const isNew = await claimWebhookEvent(prisma, {
    id: `${event.event}:${event.payload?.payment?.entity?.id ?? Date.now()}`,
    type: event.event,
    data: { object: event.payload },
  });
  if (!isNew) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.event) {
      case "payment.captured":
        await completePaidOrder(
          event.payload.payment.entity.notes.orderId,
          event.payload.payment.entity.id,
        );
        break;

      case "payment.failed":
        // Keep the PENDING order (the customer may retry) but fail the payment.
        await prisma.payment.updateMany({
          where: {
            order: { razorpayOrderId: event.payload.payment.entity.order_id },
            status: "PENDING",
          },
          data: { status: "FAILED" },
        });
        break;

      case "refund.processed": {
        const refund = event.payload.refund;
        if (refund) {
          const orderId = refund.entity.notes.orderId;
          if (orderId) await refundOrder(orderId);
        }
        break;
      }

      default:
        // Unhandled types are acknowledged, not errors.
        break;
    }
  } catch (e) {
    // Release the claim so Razorpay's retry can reprocess.
    await releaseWebhookEvent(
      prisma,
      `${event.event}:${event.payload?.payment?.entity?.id ?? ""}`,
    ).catch(() => undefined);
    console.error(`[razorpay-webhook] processing failed for ${event.event}:`, e);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Types (minimal — we only read what we need) ─────────────────────────────

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        notes: Record<string, string>;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        notes: Record<string, string>;
      };
    };
  };
}
