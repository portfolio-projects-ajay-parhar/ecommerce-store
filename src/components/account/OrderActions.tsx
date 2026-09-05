"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { getErrorMessage } from "@/lib/http";
import { openRazorpayCheckout } from "@/lib/razorpay-client";

/** "Pay again" for PENDING orders — opens the Razorpay Checkout modal. */
export function OrderActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status !== "PENDING") return null;

  const pay = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.toast(json.error ?? "Could not start payment", "error");
        router.refresh();
        return;
      }
      // Open the Razorpay modal, then verify the signed result server-side.
      const result = await openRazorpayCheckout({
        keyId: json.keyId,
        razorpayOrderId: json.razorpayOrderId,
        amount: json.amount,
        currency: json.currency ?? "INR",
      });
      const verifyRes = await fetch("/api/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Payment verification failed.");
      }
      router.push(
        `/checkout/success?order_id=${encodeURIComponent(json.razorpayOrderId)}`,
      );
    } catch (e) {
      toast.toast(getErrorMessage(e), "error");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={pay}
      disabled={busy}
      className="flex w-fit items-center gap-2 rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white hover:bg-neutral-700 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
    >
      <CreditCard className="h-4 w-4" />
      {busy ? "Opening payment…" : "Complete payment"}
    </button>
  );
}
