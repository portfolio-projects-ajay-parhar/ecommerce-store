import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { claimWebhookEvent, releaseWebhookEvent } from "../webhooks";

const EVENT = {
  id: "evt_123",
  type: "checkout.session.completed",
  data: { object: { id: "cs_abc" } },
};

/** Mock webhookEvent delegate: create throws on pre-registered event ids. */
function makeDb(failCreateOn: string[] = []) {
  const claimed: string[] = [];
  const db = {
    webhookEvent: {
      create: vi.fn(async ({ data }: { data: { eventId: string } }) => {
        if (failCreateOn.includes(data.eventId) || claimed.includes(data.eventId)) {
          throw new Error("Unique constraint failed on eventId");
        }
        claimed.push(data.eventId);
        return data;
      }),
      deleteMany: vi.fn(async ({ where }: { where: { eventId: string } }) => {
        const i = claimed.indexOf(where.eventId);
        if (i >= 0) claimed.splice(i, 1);
        return { count: i >= 0 ? 1 : 0 };
      }),
    },
  } as unknown as Pick<Prisma.TransactionClient, "webhookEvent">;
  return { db, claimed };
}

describe("webhook idempotency (claim-first)", () => {
  it("first delivery claims the event → process it", async () => {
    const { db } = makeDb();
    expect(await claimWebhookEvent(db, EVENT)).toBe(true);
  });

  it("replayed event id fails the claim → duplicate no-op", async () => {
    const { db } = makeDb(["evt_123"]);
    expect(await claimWebhookEvent(db, EVENT)).toBe(false);
  });

  it("a second claim of the same live event also fails", async () => {
    const { db } = makeDb();
    expect(await claimWebhookEvent(db, EVENT)).toBe(true);
    expect(await claimWebhookEvent(db, EVENT)).toBe(false);
  });

  it("failed processing releases the claim so the retry can reprocess", async () => {
    const { db, claimed } = makeDb();
    await claimWebhookEvent(db, EVENT);
    expect(claimed).toContain("evt_123");

    await releaseWebhookEvent(db, "evt_123");
    expect(claimed).not.toContain("evt_123");

    // Re-delivery can claim again
    expect(await claimWebhookEvent(db, EVENT)).toBe(true);
  });
});
