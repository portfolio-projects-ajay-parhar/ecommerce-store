import type { Prisma } from "@prisma/client";

/**
 * Webhook idempotency: INSERT-first (claim) keyed by the unique Razorpay event
 * id. A duplicate insert fails (unique violation) → replay is a no-op. If
 * processing throws, the claim is released so Razorpay's retry can reprocess.
 *
 * The db parameter is the Prisma client shape restricted to webhookEvent —
 * unit tests pass a mock.
 */
export async function claimWebhookEvent(
  db: Pick<Prisma.TransactionClient, "webhookEvent">,
  event: { id: string; type: string; data: { object: unknown } },
): Promise<boolean> {
  try {
    await db.webhookEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        payload: event.data.object as Prisma.InputJsonValue,
      },
    });
    return true; // new event — we own processing it
  } catch {
    return false; // unique violation → already claimed/processed
  }
}

/** Releases a failed claim so Razorpay's retry can reprocess the event. */
export async function releaseWebhookEvent(
  db: Pick<Prisma.TransactionClient, "webhookEvent">,
  eventId: string,
): Promise<void> {
  await db.webhookEvent.deleteMany({ where: { eventId } });
}
