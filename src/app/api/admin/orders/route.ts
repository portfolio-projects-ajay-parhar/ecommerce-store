import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { REVENUE_STATUSES } from "@/lib/order-status";

/** GET — all orders (admin), optional status filter + search by number/customer. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const q = sp.get("q")?.trim();
    const cursor = sp.get("cursor") ?? undefined;
    const take = Math.min(Math.max(Number(sp.get("take") ?? 20) || 20, 1), 100);

    const orders = await prisma.order.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { number: { contains: q, mode: "insensitive" } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { user: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      orderBy: { placedAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { quantity: true } },
        payment: { select: { status: true } },
      },
    });

    const hasMore = orders.length > take;
    const page = hasMore ? orders.slice(0, take) : orders;

    return NextResponse.json({
      items: page.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        totalCents: o.totalCents,
        customerName: o.user.name,
        customerEmail: o.user.email,
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        paymentStatus: o.payment?.status ?? null,
        placedAt: o.placedAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
      revenueStatuses: REVENUE_STATUSES,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
