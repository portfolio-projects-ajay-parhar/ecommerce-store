import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { REVENUE_STATUSES } from "@/lib/order-status";

/** GET — dashboard KPIs: revenue, orders by status, AOV, low stock, top products, 30-day series. */
export async function GET() {
  try {
    await requireAdmin();

    const paidOrBeyond = { status: { in: [...REVENUE_STATUSES] } };

    const [revenueAgg, ordersByStatus, customerCount, lowStock, topProducts, revenueSeries] =
      await Promise.all([
        prisma.order.aggregate({
          where: paidOrBeyond,
          _sum: { totalCents: true },
          _count: true,
        }),
        prisma.order.groupBy({
          by: ["status"],
          _count: true,
        }),
        prisma.user.count({ where: { role: "CUSTOMER" } }),
        prisma.inventory.findMany({
          where: { product: { status: "ACTIVE" } },
          include: { product: { select: { id: true, name: true, slug: true } } },
          orderBy: { quantityOnHand: "asc" },
          take: 50,
        }),
        prisma.orderItem.groupBy({
          by: ["productId"],
          where: { productId: { not: null }, order: paidOrBeyond },
          _sum: { quantity: true, lineTotalCents: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),
        // Revenue by day, last 30 days (raw SQL date_trunc group-by)
        prisma.$queryRaw<{ day: Date; revenue: bigint; orders: bigint }[]>`
          SELECT date_trunc('day', "placedAt") AS day,
                 COALESCE(SUM("totalCents"), 0)::bigint AS revenue,
                 COUNT(*)::bigint AS orders
          FROM "Order"
          WHERE "status" IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
            AND "paidAt" >= NOW() - INTERVAL '30 days'
          GROUP BY 1
          ORDER BY 1 ASC
        `,
      ]);

    const revenueCents = revenueAgg._sum.totalCents ?? 0;
    const paidOrders = revenueAgg._count;

    // Fill in zero days so the chart shows a continuous 30-day series
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const row of revenueSeries) {
      byDay.set(new Date(row.day).toISOString().slice(0, 10), {
        revenue: Number(row.revenue),
        orders: Number(row.orders),
      });
    }
    const series: { date: string; revenueCents: number; orders: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      const hit = byDay.get(key);
      series.push({ date: key, revenueCents: hit?.revenue ?? 0, orders: hit?.orders ?? 0 });
    }

    // Top products: hydrate names
    const topIds = topProducts
      .map((t) => t.productId)
      .filter((id): id is string => Boolean(id));
    const topRows = await prisma.product.findMany({
      where: { id: { in: topIds } },
      select: { id: true, name: true, slug: true },
    });
    const nameById = new Map(topRows.map((p) => [p.id, p]));

    const statusCounts: Record<string, number> = {};
    for (const g of ordersByStatus) statusCounts[g.status] = g._count;

    const lowStockItems = lowStock
      .filter((r) => r.quantityOnHand <= r.lowStockThreshold)
      .map((r) => ({
        productId: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        sku: r.sku,
        quantityOnHand: r.quantityOnHand,
        lowStockThreshold: r.lowStockThreshold,
      }));

    return NextResponse.json({
      revenueCents,
      paidOrders,
      aovCents: paidOrders > 0 ? Math.round(revenueCents / paidOrders) : 0,
      customerCount,
      ordersByStatus: statusCounts,
      lowStock: lowStockItems,
      topProducts: topProducts.map((t) => ({
        productId: t.productId,
        name: t.productId ? (nameById.get(t.productId)?.name ?? "Deleted product") : "Deleted",
        slug: t.productId ? (nameById.get(t.productId)?.slug ?? null) : null,
        unitsSold: t._sum.quantity ?? 0,
        revenueCents: t._sum.lineTotalCents ?? 0,
      })),
      revenueSeries: series,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
