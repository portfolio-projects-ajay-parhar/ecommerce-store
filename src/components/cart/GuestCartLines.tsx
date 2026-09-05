"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { http } from "@/lib/http";

interface GuestInfo {
  productId: string;
  name: string;
  slug: string;
  unitPriceCents: number;
  imageUrl: string | null;
  maxQuantity: number;
}

interface GuestLine {
  productId: string;
  quantity: number;
}

/** One guest row: hydrates catalog info from /api/cart/guest by product id. */
function GuestLineRow({
  line,
  onChange,
  onRemove,
}: {
  line: GuestLine;
  onChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  const [info, setInfo] = useState<GuestInfo | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    http
      .get<{ items: GuestInfo[] }>("/cart/guest", { params: { ids: line.productId } })
      .then(({ data }) => {
        if (!cancelled) setInfo(data.items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [line.productId]);

  if (info === undefined) {
    return (
      <li className="py-4">
        <div className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
      </li>
    );
  }
  if (!info) {
    return (
      <li className="flex items-center justify-between py-4 text-sm">
        <span className="text-neutral-500">Product unavailable</span>
        <button onClick={() => onRemove(line.productId)} className="text-red-600 hover:underline">
          Remove
        </button>
      </li>
    );
  }

  const overStock = line.quantity > info.maxQuantity;

  return (
    <li className="flex gap-4 py-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
        {info.imageUrl && (
          <Image src={info.imageUrl} alt={info.name} fill sizes="80px" className="object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/products/${info.slug}`} className="font-medium hover:underline">
          {info.name}
        </Link>
        <span className="text-sm text-neutral-500">{formatMoney(info.unitPriceCents)}</span>
        {overStock && (
          <span className="text-xs font-medium text-red-600">
            Only {info.maxQuantity} in stock — quantity will be clamped at sign-in
          </span>
        )}
        <div className="mt-auto flex items-center gap-2">
          <button
            onClick={() => onChange(line.productId, Math.max(1, line.quantity - 1))}
            className="rounded border border-neutral-300 p-1 dark:border-neutral-700"
            aria-label="Decrease"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-8 text-center text-sm">{line.quantity}</span>
          <button
            onClick={() => onChange(line.productId, line.quantity + 1)}
            className="rounded border border-neutral-300 p-1 dark:border-neutral-700"
            aria-label="Increase"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={() => onRemove(line.productId)}
            className="ml-2 text-neutral-400 hover:text-red-600"
            aria-label="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <span className="font-medium">{formatMoney(info.unitPriceCents * line.quantity)}</span>
    </li>
  );
}

export function GuestCartLines({
  lines,
  onChange,
  onRemove,
}: {
  lines: GuestLine[];
  onChange: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
      {lines.map((line) => (
        <GuestLineRow key={line.productId} line={line} onChange={onChange} onRemove={onRemove} />
      ))}
    </ul>
  );
}
