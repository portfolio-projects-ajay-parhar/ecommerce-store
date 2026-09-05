"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { CartLineView } from "@/lib/cart";

/** Signed-in cart lines: qty steppers clamp to stock, over-stock flagged. */
export function ServerCartLines({
  items,
  updateQty,
  removeItem,
}: {
  items: CartLineView[];
  updateQty: (id: string, qty: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}) {
  return (
    <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
      {items.map((line) => (
        <li key={line.id} className="flex gap-4 py-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
            {line.imageUrl && (
              <Image src={line.imageUrl} alt={line.name} fill sizes="80px" className="object-cover" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <Link href={`/products/${line.slug}`} className="font-medium hover:underline">
              {line.name}
            </Link>
            <span className="text-sm text-neutral-500">{formatMoney(line.unitPriceCents)}</span>
            {line.overStock && (
              <span className="text-xs font-medium text-red-600">
                Only {line.maxQuantity} in stock — reduce quantity to check out
              </span>
            )}
            <div className="mt-auto flex items-center gap-2">
              <button
                onClick={() => updateQty(line.id, Math.max(1, line.quantity - 1))}
                className="rounded border border-neutral-300 p-1 dark:border-neutral-700"
                aria-label="Decrease"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-8 text-center text-sm">{line.quantity}</span>
              <button
                onClick={() => updateQty(line.id, line.quantity + 1)}
                disabled={line.quantity >= line.maxQuantity}
                className="rounded border border-neutral-300 p-1 disabled:opacity-40 dark:border-neutral-700"
                aria-label="Increase"
              >
                <Plus className="h-3 w-3" />
              </button>
              <button
                onClick={() => removeItem(line.id)}
                className="ml-2 text-neutral-400 hover:text-red-600"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <span className="font-medium">{formatMoney(line.lineTotalCents)}</span>
        </li>
      ))}
    </ul>
  );
}
