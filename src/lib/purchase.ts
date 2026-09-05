import type { Prisma } from "@prisma/client";
import { VERIFIED_PURCHASE_STATUSES } from "./order-status";

/**
 * Verified-purchase check: the user has an order in a PAID+ state that
 * contains the product. PENDING / CANCELLED / REFUNDED orders don't count.
 * Tests mock the delegate; production passes the shared Prisma client.
 */
export async function hasPurchased(
  db: Pick<Prisma.TransactionClient, "orderItem">,
  userId: string,
  productId: string,
): Promise<boolean> {
  const found = await db.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: VERIFIED_PURCHASE_STATUSES } },
    },
    select: { id: true },
  });
  return found !== null;
}
