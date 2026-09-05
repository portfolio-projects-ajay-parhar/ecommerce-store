import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { REVENUE_STATUSES } from "@/lib/order-status";

/** GET — customers with order count + lifetime value. Never exposes hashes. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim();

    const users = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(q
          ? {
              OR: [
                { email: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        orders: {
          where: { status: { in: [...REVENUE_STATUSES] } },
          select: { totalCents: true, placedAt: true },
        },
      },
      take: 200,
    });

    return NextResponse.json({
      items: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        orderCount: u.orders.length,
        lifetimeValueCents: u.orders.reduce((s, o) => s + o.totalCents, 0),
        lastOrderAt: u.orders.reduce<Date | null>(
          (latest, o) =>
            !latest || o.placedAt > latest ? o.placedAt : latest,
          null,
        ),
      })),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
