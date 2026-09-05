"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartContext } from "@/components/cart/CartProvider";
import { ServerCartLines } from "@/components/cart/ServerCartLines";
import { GuestCartLines } from "@/components/cart/GuestCartLines";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMoney } from "@/lib/money";

function CartPageInner() {
  const { data: session, status } = useSession();
  const { cart, isGuest, loading, updateQty, removeItem, setGuestQuantity, removeProduct, guestItems } =
    useCartContext();
  const params = useSearchParams();
  const cancelled = params.get("cancelled") === "1";
  const signedIn = status === "authenticated";

  if (status === "loading" || (signedIn && loading && cart.items.length === 0)) {
    return <div className="h-64 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />;
  }

  const isEmpty = isGuest ? cart.count === 0 : cart.items.length === 0;
  const hasOverstock = !isGuest && cart.items.some((l) => l.overStock);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Your cart</h1>
      {cancelled && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Checkout cancelled — your cart is saved. Unpaid orders expire automatically.
        </div>
      )}

      {isEmpty ? (
        <EmptyState
          title="Your cart is empty"
          description="Browse the catalog and find something you like."
          action={
            <Link
              href="/products"
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Shop products
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            {isGuest ? (
              <GuestCartLines
                lines={guestItems}
                onChange={(id, q) => setGuestQuantity(id, q)}
                onRemove={(id) => removeProduct(id)}
              />
            ) : (
              <ServerCartLines items={cart.items} updateQty={updateQty} removeItem={removeItem} />
            )}
          </div>

          <aside className="h-fit rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="font-semibold">Summary</h2>
            {!isGuest && (
              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Subtotal</dt>
                  <dd>{formatMoney(cart.subtotalCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neutral-500">Shipping</dt>
                  <dd>
                    {cart.shippingCents === 0 ? "Free" : formatMoney(cart.shippingCents)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-800">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart.totalCents)}</dd>
                </div>
              </dl>
            )}
            {isGuest && (
              <p className="mt-3 text-sm text-neutral-500">
                Sign in to see totals and check out — your cart will be merged.
              </p>
            )}
            {hasOverstock && (
              <p className="mt-3 text-xs font-medium text-red-600">
                Fix over-stock lines before checking out.
              </p>
            )}
            {signedIn ? (
              <Link
                href="/checkout"
                aria-disabled={hasOverstock}
                className={`mt-4 block rounded-xl px-4 py-3 text-center font-medium text-white ${
                  hasOverstock
                    ? "pointer-events-none bg-neutral-400 dark:bg-neutral-600"
                    : "bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                }`}
              >
                Continue to checkout
              </Link>
            ) : (
              <Link
                href="/signin?callbackUrl=/cart"
                className="mt-4 block rounded-xl bg-neutral-900 px-4 py-3 text-center font-medium text-white dark:bg-white dark:text-neutral-900"
              >
                Sign in to check out
              </Link>
            )}
          </aside>
        </div>
      )}
      {!session && null}
    </div>
  );
}

export function CartPage() {
  return (
    <Suspense>
      <CartPageInner />
    </Suspense>
  );
}
