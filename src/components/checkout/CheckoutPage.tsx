"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartContext } from "@/components/cart/CartProvider";
import { AddressPicker, PayButton, type AddressDTO } from "@/components/checkout/CheckoutParts";
import { formatMoney } from "@/lib/money";
import { http } from "@/lib/http";

export function CheckoutPage() {
  const { cart } = useCartContext();
  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .get<{ items: AddressDTO[] }>("/addresses")
      .then(({ data }) => {
        setAddresses(data.items);
        const def = data.items.find((a) => a.isDefault) ?? data.items[0];
        setSelected(def?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (cart.items.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <Link href="/cart" className="text-sm underline">
          Back to cart
        </Link>
      </div>
    );
  }

  const hasOverstock = cart.items.some((l) => l.overStock);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Shipping address</h2>
          <AddressPicker
            addresses={addresses}
            selected={selected}
            onSelect={setSelected}
            loading={loading}
          />
        </section>

        <aside className="h-fit rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="font-semibold">Order summary</h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {cart.items.map((l) => (
              <li key={l.id} className="flex justify-between gap-2">
                <span className="truncate text-neutral-500">
                  {l.name} × {l.quantity}
                </span>
                <span>{formatMoney(l.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-3 text-sm dark:border-neutral-800">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Subtotal</dt>
              <dd>{formatMoney(cart.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Shipping</dt>
              <dd>{cart.shippingCents === 0 ? "Free" : formatMoney(cart.shippingCents)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(cart.totalCents)}</dd>
            </div>
          </dl>
          <PayButton addressId={selected} disabled={hasOverstock} />
          {hasOverstock && (
            <p className="mt-2 text-xs font-medium text-red-600">
              Fix over-stock lines in your{" "}
              <Link href="/cart" className="underline">
                cart
              </Link>{" "}
              first.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
