import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true, user: { select: { name: true, email: true } } },
  });
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.number}</h1>
          <p className="text-sm text-neutral-500">
            {order.user.name} · {order.user.email} · placed {formatDate(order.placedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {order.payment && <StatusBadge status={order.payment.status} />}
          <StatusBadge status={order.status} />
        </div>
      </div>

      <OrderStatusControls orderId={order.id} status={order.status} />

      <section>
        <h2 className="mb-2 font-semibold">Items (snapshots)</h2>
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center justify-between p-3">
              <span>
                {i.productName}
                <span className="text-neutral-400"> ({i.productSlug})</span>
              </span>
              <span className="text-neutral-500">
                {formatMoney(i.unitPriceCents)} × {i.quantity} ={" "}
                <strong className="text-neutral-900 dark:text-neutral-100">
                  {formatMoney(i.lineTotalCents)}
                </strong>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-right text-sm">
          Subtotal {formatMoney(order.subtotalCents)} · Shipping{" "}
          {formatMoney(order.shippingCents)} ·{" "}
          <strong>Total {formatMoney(order.totalCents)}</strong>
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Shipping snapshot</h2>
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
          </p>
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Payment</h2>
          <p className="text-sm text-neutral-500">
            Provider: {order.payment?.provider ?? "—"}
            <br />
            Status: {order.payment?.status ?? "—"}
            <br />
            Amount: {formatMoney(order.totalCents)}
            <br />
            {order.razorpayPaymentId && <>Payment ID: {order.razorpayPaymentId}</>}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Timeline</h2>
        <ul className="text-sm text-neutral-500">
          <li>Placed: {formatDate(order.placedAt)}</li>
          {order.paidAt && <li>Paid: {formatDate(order.paidAt)}</li>}
          {order.shippedAt && <li>Shipped: {formatDate(order.shippedAt)}</li>}
          {order.deliveredAt && <li>Delivered: {formatDate(order.deliveredAt)}</li>}
          {order.cancelledAt && <li>Cancelled: {formatDate(order.cancelledAt)}</li>}
        </ul>
      </section>
    </div>
  );
}
