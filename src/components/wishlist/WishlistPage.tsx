"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCartContext } from "@/components/cart/CartProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/money";

interface WishlistEntry {
  productId: string;
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    image: string | null;
    quantityOnHand: number;
  };
}

export function WishlistPage() {
  const { status } = useSession();
  const { addItem } = useCartContext();
  const [items, setItems] = useState<WishlistEntry[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((json) => setItems(json.items ?? []))
      .catch(() => setItems([]));
  }, [status]);

  const remove = async (productId: string) => {
    await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
    setItems((prev) => prev?.filter((e) => e.productId !== productId) ?? null);
  };

  const addToCart = async (productId: string) => {
    await addItem(productId, 1);
    await remove(productId);
  };

  if (status === "loading") {
    return <div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />;
  }

  if (status === "unauthenticated") {
    return (
      <EmptyState
        title="Sign in to see your wishlist"
        description="Save products while you browse and find them here later."
        action={
          <Link
            href="/signin?callbackUrl=/wishlist"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Wishlist</h1>
      {!items ? (
        <div className="h-48 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Tap the heart on any product to save it for later."
          action={
            <Link
              href="/products"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Browse products
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map(({ product }) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              <Link
                href={`/products/${product.slug}`}
                className="relative aspect-square bg-neutral-100 dark:bg-neutral-800"
              >
                {product.image && (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="25vw"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <Link href={`/products/${product.slug}`} className="text-sm font-medium hover:underline">
                  {product.name}
                </Link>
                <span className="text-sm font-semibold">{formatMoney(product.priceCents)}</span>
                {product.quantityOnHand === 0 && (
                  <span className="text-xs text-red-600">Out of stock</span>
                )}
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => addToCart(product.id)}
                    disabled={product.quantityOnHand < 1}
                    className="flex-1 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                  >
                    Add to cart
                  </button>
                  <button
                    onClick={() => remove(product.id)}
                    className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-500 hover:text-red-600 dark:border-neutral-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
