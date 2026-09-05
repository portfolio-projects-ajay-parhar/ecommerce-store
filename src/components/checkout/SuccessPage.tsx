"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@prisma/client";

interface OrderDTO {
  id: string;
  number: string;
  status: OrderStatus;
  totalCents: number;
  items: { productName: string; quantity: number; lineTotalCents: number }[];
}

function SuccessInner() {
  const params = useSearchParams();
  const razorpayOrderId = params.get("order_id");
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [polls, setPolls] = useState(0);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!razorpayOrderId) return;
    try {
      // Look up the order server-side via the Razorpay order id
      const res = await fetch(`/api/orders/by-order/${encodeURIComponent(razorpayOrderId)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const json = (await res.json()) as { order: OrderDTO };
        setOrder(json.order);
        return json.order.status;
      }
    } catch {
      // retry below
    }
    return undefined;
  }, [razorpayOrderId]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const status = await load();
      if (cancelled) return;
      if (status && status !== "PENDING") return; // verify/webhook landed
      if (polls < 10) {
        setTimeout(() => !cancelled && setPolls((p) => p + 1), 3000);
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [load, polls]);

  const pending = !order || order.status === "PENDING";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-12 text-center">
      {notFound ? (
        <>
          <XCircle className="h-14 w-14 text-red-500" />
          <h1 className="text-2xl font-bold">Order not found</h1>
          <p className="text-neutral-500">
            We couldn&apos;t find an order for that checkout session.
          </p>
        </>
      ) : pending ? (
        <>
          <Clock className="h-14 w-14 animate-pulse text-amber-500" />
          <h1 className="text-2xl font-bold">Confirming your payment…</h1>
          <p className="text-sm text-neutral-500">
            This usually takes a few seconds. You can safely leave this page —
            the order will appear in your account either way.
          </p>
        </>
      ) : order.status === "CANCELLED" ? (
        <>
          <XCircle className="h-14 w-14 text-red-500" />
          <h1 className="text-2xl font-bold">Payment not completed</h1>
          <p className="text-sm text-neutral-500">Your order was cancelled.</p>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-14 w-14 text-green-600" />
          <h1 className="text-2xl font-bold">Thank you for your order!</h1>
          <p className="text-sm text-neutral-500">
            Order <strong>{order.number}</strong> · {formatMoney(order.totalCents)} ·{" "}
            {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
          </p>
          {order.items.length > 0 && (
            <ul className="w-full rounded-xl border border-neutral-200 p-4 text-left text-sm dark:border-neutral-800">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between py-0.5">
                  <span className="text-neutral-500">
                    {i.productName} × {i.quantity}
                  </span>
                  <span>{formatMoney(i.lineTotalCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link
        href="/account/orders"
        className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
      >
        View your orders
      </Link>
    </div>
  );
}

export function SuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
