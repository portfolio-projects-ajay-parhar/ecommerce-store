import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

/** GET — the signed-in user's own orders (newest first). */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status");
    const cursor = sp.get("cursor") ?? undefined;
    const take = Math.min(Math.max(Number(sp.get("take") ?? 10) || 10, 1), 50);

    const orders = await prisma.order.findMany({
      where: { userId: user.id, ...(status ? { status: status as never } : {}) },
      orderBy: { placedAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        items: true,
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
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        paymentStatus: o.payment?.status ?? null,
        placedAt: o.placedAt,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
