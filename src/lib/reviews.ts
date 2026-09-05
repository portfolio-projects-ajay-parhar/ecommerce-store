import type { Prisma } from "@prisma/client";

/**
 * Recomputes the denormalized Product rating aggregates from PUBLISHED
 * reviews only. HIDDEN reviews are excluded from both the average and the
 * count. Must be called in the same transaction as any review write.
 */
export async function recomputeReviewAggregates(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<{ avgRating: number; reviewCount: number }> {
  const agg = await tx.review.aggregate({
    where: { productId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  const avgRating = Math.round((agg._avg.rating ?? 0) * 10) / 10;
  const reviewCount = agg._count;
  await tx.product.update({
    where: { id: productId },
    data: { avgRating, reviewCount },
  });
  return { avgRating, reviewCount };
}
