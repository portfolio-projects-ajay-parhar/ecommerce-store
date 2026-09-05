"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { http, getErrorMessage } from "@/lib/http";
import { useToast } from "@/components/providers/ToastProvider";
import { ALLOWED_TRANSITIONS } from "@/lib/order-status";
import type { OrderStatus } from "@prisma/client";

/**
 * Buttons for each legal transition from the current status. The server
 * re-validates via assertTransition (illegal moves → 422).
 * PENDING→PAID happens only via Razorpay verification/webhook, so it's not offered here.
 */
export function OrderStatusControls({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const nexts = (ALLOWED_TRANSITIONS[status as OrderStatus] ?? []).filter(
    (s) => !(status === "PENDING" && s === "PAID"),
  );

  if (nexts.length === 0) {
    return <p className="text-sm text-neutral-500">This order is in a terminal state.</p>;
  }

  const move = async (to: string) => {
    setBusy(true);
    try {
      await http.patch(`/orders/${orderId}`, { status: to });
      toast.toast(`Order moved to ${to}`, "success");
      router.refresh();
    } catch (e) {
      toast.toast(getErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-neutral-500">Move to:</span>
      {nexts.map((s) => (
        <button
          key={s}
          onClick={() => move(s)}
          disabled={busy}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
