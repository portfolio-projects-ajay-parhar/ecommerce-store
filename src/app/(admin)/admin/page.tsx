import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { REVENUE_STATUSES } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

export default async function AdminDashboardPage() {
  const paidOrBeyond = { status: { in: [...REVENUE_STATUSES] } };

  const [revenueAgg, statusGroups, customerCount, lowStock, topProducts, revenueRaw] =
    await Promise.all([
      prisma.order.aggregate({ where: paidOrBeyond, _sum: { totalCents: true }, _count: true }),
      prisma.order.groupBy({ by: ["status"], _count: true }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.inventory.findMany({
        where: { product: { status: "ACTIVE" } },
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { quantityOnHand: "asc" },
        take: 5,
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { productId: { not: null }, order: paidOrBeyond },
        _sum: { quantity: true, lineTotalCents: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.$queryRaw<{ day: Date; revenue: bigint }[]>`
        SELECT date_trunc('day', "placedAt") AS day,
               COALESCE(SUM("totalCents"), 0)::bigint AS revenue
        FROM "Order"
        WHERE "status" IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
          AND "paidAt" >= NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1 ASC`,
    ]);

  const revenueCents = revenueAgg._sum.totalCents ?? 0;
  const paidOrders = revenueAgg._count;
  const aovCents = paidOrders > 0 ? Math.round(revenueCents / paidOrders) : 0;

  // Continuous 30-day revenue series → SVG sparkline
  const byDay = new Map<string, number>();
  for (const row of revenueRaw) {
    byDay.set(new Date(row.day).toISOString().slice(0, 10), Number(row.revenue));
  }
  const series: number[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    series.push(byDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  const max = Math.max(...series, 1);
  const points = series
    .map((v, i) => `${(i / 29) * 100},${30 - (v / max) * 28}`)
    .join(" ");

  const topIds = topProducts
    .map((t) => t.productId)
    .filter((id): id is string => Boolean(id));
  const topRows = await prisma.product.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topRows.map((p) => [p.id, p.name]));

  const kpis = [
    { label: "Revenue (paid)", value: formatMoney(revenueCents) },
    { label: "Paid orders", value: String(paidOrders) },
    { label: "Avg order value", value: formatMoney(aovCents) },
    { label: "Customers", value: String(customerCount) },
  ];

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Sales dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="text-xs uppercase tracking-wide text-neutral-400">{k.label}</p>
            <p className="mt-1 text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Revenue — last 30 days</h2>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <svg viewBox="0 0 100 30" className="h-24 w-full" preserveAspectRatio="none">
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-neutral-900 dark:text-white"
            />
          </svg>
          <p className="mt-1 text-xs text-neutral-400">Peak day: {formatMoney(max)}</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Top products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-neutral-500">No paid orders yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {topProducts.map((t) => (
                <li
                  key={t.productId}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800"
                >
                  <span className="truncate">
                    {t.productId ? (nameById.get(t.productId) ?? "Deleted") : "Deleted"}
                  </span>
                  <span className="shrink-0 text-neutral-500">
                    {t._sum.quantity ?? 0} sold · {formatMoney(t._sum.lineTotalCents ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Low stock</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing low.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {lowStock.map((inv) => {
                const low = inv.quantityOnHand <= inv.lowStockThreshold;
                return (
                  <li
                    key={inv.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      low
                        ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <span className="truncate">{inv.product.name}</span>
                    <span className={`shrink-0 font-medium ${low ? "text-amber-700 dark:text-amber-300" : "text-neutral-500"}`}>
                      {inv.quantityOnHand} left
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/admin/inventory" className="mt-2 inline-block text-sm underline">
            Manage inventory →
          </Link>
        </section>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">Orders by status</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          {statusGroups.length === 0 && <p className="text-neutral-500">No orders yet.</p>}
          {statusGroups.map((g) => (
            <span key={g.status} className="rounded-full border border-neutral-200 px-3 py-1 dark:border-neutral-700">
              {g.status}: <strong>{g._count}</strong>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
