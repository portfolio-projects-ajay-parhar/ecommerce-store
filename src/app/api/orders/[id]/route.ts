import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrderOwner, requireAdmin, AuthError } from "@/lib/auth";
import { assertSameOrigin, errorResponse } from "@/lib/api";
import { adminOrderPatchSchema } from "@/lib/validators";
import { assertTransition } from "@/lib/order-status";
import { statusTimestampField, restockOrderItems } from "@/lib/checkout";

type Params = { params: Promise<{ id: string }> };

/** GET — owner or ADMIN. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { order } = await requireOrderOwner(id);

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true,
        payment: true,
        user: { select: { name: true, email: true } },
      },
    });
    return NextResponse.json({ order: full });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PATCH — ADMIN only: drive status transitions through the status machine
 * (PENDING→PAID happens only via the webhook; CANCELLED from PENDING with
 * restock; REFUNDED is driven by Razorpay but admin can force the DB state).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    assertSameOrigin(req);
    await requireAdmin();
    const { id } = await params;
    const body = adminOrderPatchSchema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new AuthError(404, "Order not found.");

    assertTransition(order.status, body.status); // 422 on illegal moves

    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: order.id },
        data: {
          status: body.status,
          ...statusTimestampField(body.status),
        },
      });
      if (body.status === "REFUNDED") {
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: "REFUNDED" },
        });
        await restockOrderItems(tx, order.id);
      }
      if (body.status === "CANCELLED") {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: "PENDING" },
          data: { status: "FAILED" },
        });
        await restockOrderItems(tx, order.id);
      }
      return o;
    });

    return NextResponse.json({ order: updated });
  } catch (e) {
    return errorResponse(e);
  }
}
