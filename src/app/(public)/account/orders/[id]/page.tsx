import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { OrderActions } from "@/components/account/OrderActions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const TIMELINE: { status: string; label: string }[] = [
  { status: "PENDING", label: "Placed" },
  { status: "PAID", label: "Paid" },
  { status: "PROCESSING", label: "Processing" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
];

export default async function OrderDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await requirePageUser();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true },
  });
  // 404 for other users' orders (don't leak ids)
  if (!order || (order.userId !== user.id && user.role !== "ADMIN")) notFound();

  const timelineIndex = TIMELINE.findIndex((t) => t.status === order.status);
  const terminal =
    order.status === "CANCELLED" || order.status === "REFUNDED";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.number}</h1>
          <p className="text-sm text-neutral-500">Placed {formatDate(order.placedAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {order.payment && <StatusBadge status={order.payment.status} />}
        </div>
      </div>

      {!terminal && (
        <ol className="flex flex-wrap items-center gap-2 text-xs">
          {TIMELINE.map((t, i) => {
            const done = i <= timelineIndex;
            return (
              <li key={t.status} className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 font-medium ${
                    done
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                  }`}
                >
                  {t.label}
                </span>
                {i < TIMELINE.length - 1 && <span className="text-neutral-300">→</span>}
              </li>
            );
          })}
        </ol>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Items</h2>
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-4 p-4 text-sm">
              <div>
                {/* Snapshot: name/price from when the order was placed */}
                <Link href={`/products/${i.productSlug}`} className="font-medium hover:underline">
                  {i.productName}
                </Link>
                <p className="text-neutral-500">
                  {formatMoney(i.unitPriceCents)} × {i.quantity}
                </p>
              </div>
              <span className="font-medium">{formatMoney(i.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto mt-2 flex w-64 flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Subtotal</dt>
            <dd>{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Shipping</dt>
            <dd>{order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Shipping address</h2>
          <p className="text-sm text-neutral-500">
            {order.shippingName}
            <br />
            {order.shippingLine1}
            {order.shippingLine2 ? `, ${order.shippingLine2}` : ""}
            <br />
            {order.shippingCity}
            {order.shippingState ? `, ${order.shippingState}` : ""} {order.shippingPostalCode}
            <br />
            {order.shippingCountry}
            {order.shippingPhone ? (
              <>
                <br />
                {order.shippingPhone}
              </>
            ) : null}
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Timeline</h2>
          <ul className="text-sm text-neutral-500">
            <li>Placed: {formatDate(order.placedAt)}</li>
            {order.paidAt && <li>Paid: {formatDate(order.paidAt)}</li>}
            {order.shippedAt && <li>Shipped: {formatDate(order.shippedAt)}</li>}
            {order.deliveredAt && <li>Delivered: {formatDate(order.deliveredAt)}</li>}
            {order.cancelledAt && <li>Cancelled: {formatDate(order.cancelledAt)}</li>}
          </ul>
        </div>
      </section>

      <OrderActions orderId={order.id} status={order.status} />
      <Link href="/account/orders" className="text-sm text-neutral-500 hover:underline">
        ← All orders
      </Link>
    </div>
  );
}
