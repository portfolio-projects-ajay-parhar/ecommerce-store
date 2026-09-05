"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartContext } from "@/components/cart/CartProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { http, getErrorMessage } from "@/lib/http";
import { openRazorpayCheckout } from "@/lib/razorpay-client";

export interface AddressDTO {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export function formatAddressLine(a: AddressDTO) {
  return `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}${a.state ? `, ${a.state}` : ""} ${a.postalCode}, ${a.country}`;
}

/** Address radio list + "add new" prompt. */
export function AddressPicker({
  addresses,
  selected,
  onSelect,
  loading,
}: {
  addresses: AddressDTO[];
  selected: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />;
  }
  if (addresses.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-800">
        You don&apos;t have a saved address yet.{" "}
        <a href="/account/addresses" className="underline">
          Add one first
        </a>{" "}
        — then come back to check out.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {addresses.map((a) => (
        <li key={a.id}>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              selected === a.id
                ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-900"
                : "border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <input
              type="radio"
              name="address"
              checked={selected === a.id}
              onChange={() => onSelect(a.id)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium">
                {a.label ?? a.fullName}
                {a.isDefault && (
                  <span className="ml-2 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] dark:bg-neutral-700">
                    Default
                  </span>
                )}
              </span>
              <br />
              <span className="text-neutral-500">{formatAddressLine(a)}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Pay button → POST /api/checkout/session → Razorpay Checkout modal. */
export function PayButton({
  addressId,
  disabled,
}: {
  addressId: string | null;
  disabled?: boolean;
}) {
  const { refresh } = useCartContext();
  const toast = useToast();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  const pay = async () => {
    if (!addressId) return;
    setPaying(true);
    try {
      const { data } = await http.post<{
        orderId?: string;
        orderNumber?: string;
        razorpayOrderId?: string | null;
        amount?: number;
        currency?: string;
        keyId?: string;
        error?: string;
      }>("/checkout/session", { addressId });

      if (data.razorpayOrderId && data.keyId && data.amount) {
        // Open the Razorpay modal, then verify the signed result server-side.
        const result = await openRazorpayCheckout({
          keyId: data.keyId,
          razorpayOrderId: data.razorpayOrderId,
          amount: data.amount,
          currency: data.currency ?? "INR",
        });
        await http.post("/checkout/verify", {
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        });
        refresh();
        router.push(`/checkout/success?order_id=${encodeURIComponent(data.razorpayOrderId)}`);
        return;
      }

      // Razorpay unconfigured (dev) — the PENDING order exists; go to it.
      toast.toast(data.error ?? "Order created (payment unavailable)", "info");
      refresh();
      router.push(`/account/orders/${data.orderId ?? ""}`);
    } catch (e) {
      toast.toast(getErrorMessage(e), "error");
      refresh();
    } finally {
      setPaying(false);
    }
  };

  return (
    <button
      onClick={pay}
      disabled={!addressId || paying || disabled}
      className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
    >
      {paying ? "Opening payment…" : "Pay with Razorpay"}
    </button>
  );
}
