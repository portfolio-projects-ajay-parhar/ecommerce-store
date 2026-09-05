import type { Prisma } from "@prisma/client";

/**
 * Human-readable order numbers: ORD-<YYYY>-<NNNN>.
 *
 * Sequence = count of orders placed this year + 1, with a collision retry that
 * falls back to a random suffix. Called inside the checkout transaction — the
 * retry loop plus the unique index guarantees uniqueness without a sequence.
 */
export function formatOrderNumber(year: number, seq: number): string {
  return `ORD-${year}-${String(seq).padStart(4, "0")}`;
}

export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  year = new Date().getFullYear(),
): Promise<string> {
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const count = await tx.order.count({
    where: { placedAt: { gte: startOfYear } },
  });

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = formatOrderNumber(year, count + 1 + attempt);
    const clash = await tx.order.findUnique({
      where: { number: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
  }

  // Extremely unlikely fallback: random suffix
  return `ORD-${year}-${String(count + 1).padStart(4, "0")}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}
