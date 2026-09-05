"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCartContext } from "@/components/cart/CartProvider";
import { getErrorMessage, isOutOfStockError } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";

/** Add-to-cart with qty stepper; prompts sign-in for guests? No — guests get a localStorage cart. */
export function AddToCartButton({
  productId,
  stock,
  size = "md",
}: {
  productId: string;
  stock: number;
  size?: "sm" | "md";
}) {
  const { addItem } = useCartContext();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const outOfStock = stock < 1;

  const add = async () => {
    setBusy(true);
    try {
      await addItem(productId, quantity);
      toast.toast("Added to cart", "success");
    } catch (e) {
      if (isOutOfStockError(e)) toast.toast("Not enough stock available", "error");
      else toast.toast(getErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (size === "sm") {
    return (
      <button
        onClick={add}
        disabled={outOfStock || busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <ShoppingBag className="h-4 w-4" />
        {outOfStock ? "Out of stock" : "Add to cart"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="rounded-lg border border-neutral-300 p-2 disabled:opacity-40 dark:border-neutral-700"
          disabled={quantity <= 1 || outOfStock}
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center font-medium">{quantity}</span>
        <button
          onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
          className="rounded-lg border border-neutral-300 p-2 disabled:opacity-40 dark:border-neutral-700"
          disabled={outOfStock || quantity >= stock}
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </button>
        {stock > 0 && stock <= 5 && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            Only {stock} left
          </span>
        )}
      </div>
      <button
        onClick={add}
        disabled={outOfStock || busy}
        className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <ShoppingBag className="h-5 w-5" />
        {outOfStock ? "Out of stock" : busy ? "Adding…" : "Add to cart"}
      </button>
    </div>
  );
}

/** Wishlist heart — idempotent toggle, redirects guests to sign-in. */
export function WishlistButton({
  productId,
  initialInWishlist = false,
}: {
  productId: string;
  initialInWishlist?: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [inList, setInList] = useState(initialInWishlist);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (status !== "authenticated") {
      router.push(`/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    const next = !inList;
    try {
      if (next) {
        await fetch(`/api/wishlist/${productId}`, { method: "POST" });
        toast.toast("Saved to wishlist", "success");
      } else {
        await fetch(`/api/wishlist/${productId}`, { method: "DELETE" });
        toast.toast("Removed from wishlist", "info");
      }
      setInList(next);
    } catch {
      toast.toast("Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="rounded-xl border border-neutral-300 p-3 transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
      aria-label={inList ? "Remove from wishlist" : "Add to wishlist"}
      title={inList ? "Remove from wishlist" : "Add to wishlist"}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill={inList ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
