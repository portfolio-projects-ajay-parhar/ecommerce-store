import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { hasPurchased } from "../purchase";

type Db = Pick<Prisma.TransactionClient, "orderItem">;

/**
 * hasPurchased takes a db client (orderItem delegate) — inject a mock to
 * verify the query shape: PENDING/CANCELLED/REFUNDED orders must not count.
 */
function makeDb(firstResult: { id: string } | null): Db {
  return {
    orderItem: {
      findFirst: vi.fn().mockResolvedValue(firstResult),
    },
  } as unknown as Db;
}

describe("hasPurchased (verified purchase check)", () => {
  it("returns true when a PAID+ order contains the product", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "oi_1" });
    const db = { orderItem: { findFirst } } as unknown as Db;
    const ok = await hasPurchased(db, "user1", "prod1");
    expect(ok).toBe(true);
    // Assert the query filters to verified purchase statuses
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: "prod1",
          order: {
            userId: "user1",
            status: { in: expect.arrayContaining(["PAID", "DELIVERED"]) },
          },
        }),
      }),
    );
    const where = findFirst.mock.calls[0][0].where;
    expect(where.order.status.in).toEqual(
      expect.not.arrayContaining(["PENDING", "CANCELLED", "REFUNDED"]),
    );
  });

  it("returns false when nothing is found", async () => {
    const db = makeDb(null);
    expect(await hasPurchased(db, "user1", "prod1")).toBe(false);
  });
});
